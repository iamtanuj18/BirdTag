import hashlib
import json
import os
import tempfile
import time
import urllib.parse

import boto3

from detection import detect_birds

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
lambda_client = boto3.client("lambda")
sns = boto3.client("sns")

S3_BUCKET_NAME = os.environ["S3_BUCKET_NAME"]
DYNAMODB_TABLE_NAME = os.environ["DYNAMODB_TABLE_NAME"]
THUMBNAIL_LAMBDA_ARN = os.environ["THUMBNAIL_LAMBDA_ARN"]
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN")

table = dynamodb.Table(DYNAMODB_TABLE_NAME)


def lambda_handler(event, context):
    try:
        record       = event["Records"][0]
        s3_key_raw   = record["s3"]["object"]["key"]
        s3_key       = urllib.parse.unquote_plus(s3_key_raw)
        filename     = os.path.basename(s3_key)
        ext          = os.path.splitext(filename)[1].lower()

        # Get uploaded user and original filename from S3 object metadata
        uploaded_by       = "unknown"
        original_filename = filename
        uploaded_at       = int(time.time())
        try:
            obj_metadata      = s3.head_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
            uploaded_by       = obj_metadata.get("Metadata", {}).get("uploadedby", "unknown")
            original_filename = obj_metadata.get("Metadata", {}).get("originalfilename", filename)
        except Exception as e:
            pass

        # Detect file type from extension
        if ext in [".jpg", ".jpeg", ".png"]:
            file_type = "image"
        elif ext in [".mp4", ".mov", ".mkv"]:
            file_type = "video"
        elif ext in [".wav", ".mp3", ".flac", ".ogg", ".m4a", ".wma"]:
            file_type = "audio"
        else:
            file_type = "unknown"

        if ext not in [".jpg", ".jpeg", ".png", ".mp4", ".mov", ".mkv", ".wav", ".mp3", ".flac", ".ogg", ".m4a", ".wma"]:
            table.put_item(Item={
                "mediaId"      : s3_key,
                "uploadedBy"   : uploaded_by,
                "uploadedAt"   : uploaded_at,
                "filename"     : original_filename,
                "status"       : "unsupported_file",
                "fileType"     : file_type,
                "s3Url"        : f"s3://{S3_BUCKET_NAME}/{s3_key}",
                "errorMessage" : "File type not supported",
                "ttl"          : int(time.time()) + (24 * 60 * 60)
            })
            s3.put_object_tagging(
                Bucket=S3_BUCKET_NAME,
                Key=s3_key,
                Tagging={'TagSet': [{'Key': 'Status', 'Value': 'failed'}]}
            )
            return

        # Create initial processing record in main table
        table.put_item(Item={
            "mediaId"    : s3_key,
            "uploadedBy" : uploaded_by,
            "uploadedAt" : uploaded_at,
            "filename"   : original_filename,
            "status"     : "processing",
            "fileType"   : file_type,
            "s3Url"      : f"s3://{S3_BUCKET_NAME}/{s3_key}"
        })

        with tempfile.TemporaryDirectory() as tmpdir:
            local_path = os.path.join(tmpdir, filename)
            s3.download_file(S3_BUCKET_NAME, s3_key, local_path)

            detected_type, counts = detect_birds(local_path)

        if not counts:
            table.update_item(
                Key={"mediaId": s3_key},
                UpdateExpression="SET #s = :status, errorMessage = :error, #ttl = :ttl",
                ExpressionAttributeNames={"#s": "status", "#ttl": "ttl"},
                ExpressionAttributeValues={
                    ":status" : "no_bird",
                    ":error"  : "No birds detected in this media",
                    ":ttl"    : int(time.time()) + (24 * 60 * 60)
                }
            )
            s3.put_object_tagging(
                Bucket=S3_BUCKET_NAME,
                Key=s3_key,
                Tagging={'TagSet': [{'Key': 'Status', 'Value': 'failed'}]}
            )
            return

        thumb_key = None
        if detected_type == "image":
            try:
                response     = lambda_client.invoke(
                    FunctionName   = THUMBNAIL_LAMBDA_ARN,
                    InvocationType = "RequestResponse",
                    Payload        = json.dumps({"bucket": S3_BUCKET_NAME, "key": s3_key}),
                )
                thumb_result = json.load(response["Payload"])
                thumb_key    = thumb_result.get("thumb_key")
            except Exception as e:
                pass

        tagset_hash = hashlib.md5(json.dumps(counts, sort_keys=True).encode()).hexdigest()

        table.update_item(
            Key={"mediaId": s3_key},
            UpdateExpression="SET #s = :status, tags = :tags, birdCount = :count, thumbUrl = :thumb, tagsetHash = :hash",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":status" : "success",
                ":tags"   : json.dumps(counts),
                ":count"  : sum(counts.values()),
                ":thumb"  : f"s3://{S3_BUCKET_NAME}/{thumb_key}" if thumb_key else None,
                ":hash"   : tagset_hash
            }
        )

        file_url = f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{thumb_key if thumb_key else s3_key}"

        if SNS_TOPIC_ARN:
            try:
                sns.publish(
                    TopicArn = SNS_TOPIC_ARN,
                    Subject  = "New Bird Detection Alert",
                    Message  = json.dumps({
                        "event"   : "new_bird_detection",
                        "mediaId" : s3_key,
                        "tags"    : counts,
                        "fileType": detected_type,
                        "url"     : file_url,
                        "uploadedBy": uploaded_by,
                    }),
                )
            except Exception as e:
                pass

    except Exception as e:
        try:
            table.update_item(
                Key={"mediaId": s3_key},
                UpdateExpression="SET #s = :status, errorMessage = :error, #ttl = :ttl",
                ExpressionAttributeNames={"#s": "status", "#ttl": "ttl"},
                ExpressionAttributeValues={
                    ":status" : "error",
                    ":error"  : "System failure. Please try re-uploading the file.",
                    ":ttl"    : int(time.time()) + (24 * 60 * 60)
                }
            )
            s3.put_object_tagging(
                Bucket=S3_BUCKET_NAME,
                Key=s3_key,
                Tagging={'TagSet': [{'Key': 'Status', 'Value': 'failed'}]}
            )
        except:
            pass


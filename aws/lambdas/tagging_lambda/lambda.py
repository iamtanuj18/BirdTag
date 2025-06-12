import os
import json
import tempfile
import boto3
import hashlib
import time
from detection import detect_birds

# AWS clients
s3            = boto3.client("s3")
dynamodb      = boto3.resource("dynamodb")
lambda_client = boto3.client("lambda")
sns           = boto3.client("sns")

# Environment variables
BUCKET_NAME         = os.environ["BUCKET_NAME"]
DDB_TABLE_NAME      = os.environ.get("DYNAMODB_TABLE_NAME", "BirdMediaTable")
STATUS_TABLE_NAME   = os.environ.get("STATUS_TABLE_NAME", "BirdTagProcessingStatus")
THUMBNAIL_LAMBDA    = os.environ.get("THUMBNAIL_LAMBDA_NAME", "thumbnail-lambda")
SNS_TOPIC_ARN       = os.environ.get("SNS_TOPIC_ARN")

table         = dynamodb.Table(DDB_TABLE_NAME)
status_table  = dynamodb.Table(STATUS_TABLE_NAME)


def lambda_handler(event, context):
    print("Received S3 event:", event)
    try:
        record    = event["Records"][0]
        s3_key    = record["s3"]["object"]["key"]
        filename  = os.path.basename(s3_key)
        ext       = os.path.splitext(filename)[1].lower()

        if ext not in [".jpg", ".jpeg", ".png", ".mp4", ".mov", ".mkv", ".wav", ".mp3", ".flac", ".ogg", ".m4a", ".wma"]:
            update_status(s3_key, "unsupported_file")
            s3.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
            return

        update_status(s3_key, "processing")

        with tempfile.TemporaryDirectory() as tmpdir:
            local_path = os.path.join(tmpdir, filename)
            s3.download_file(BUCKET_NAME, s3_key, local_path)

            file_type, counts = detect_birds(local_path)
            print("Detection:", file_type, counts)

        if not counts:
            update_status(s3_key, "no_bird")
            s3.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
            return

        thumb_key = None
        if file_type == "image":
            response     = lambda_client.invoke(
                FunctionName   = THUMBNAIL_LAMBDA,
                InvocationType = "RequestResponse",
                Payload        = json.dumps({"bucket": BUCKET_NAME, "key": s3_key}),
            )
            thumb_result = json.load(response["Payload"])
            thumb_key    = thumb_result.get("thumb_key")
            print("Thumbnail key returned:", thumb_key)

        tagset_hash = hashlib.md5(json.dumps(counts, sort_keys=True).encode()).hexdigest()

        table.put_item(Item={
            "mediaId"    : s3_key,
            "fileType"   : file_type,
            "tags"       : json.dumps(counts),
            "birdCount"  : sum(counts.values()),
            "s3Url"      : f"s3://{BUCKET_NAME}/{s3_key}",
            "thumbUrl"   : f"s3://{BUCKET_NAME}/{thumb_key}" if thumb_key else None,
            "tagsetHash" : tagset_hash,
        })

        file_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{thumb_key if thumb_key else s3_key}"

        if SNS_TOPIC_ARN:
            try:
                sns.publish(
                    TopicArn = SNS_TOPIC_ARN,
                    Subject  = "New Bird Detection Alert",
                    Message  = json.dumps({
                        "event"   : "new_bird_detection",
                        "mediaId" : s3_key,
                        "tags"    : counts,
                        "fileType": file_type,
                        "url"     : file_url,
                    }),
                )
            except Exception as e:
                print("SNS publish failed:", e)

        update_status(s3_key, "success", {
            "fileType"  : file_type,
            "tags"      : counts,
            "birdCount" : sum(counts.values()),
            "url"       : file_url,
        })

    except Exception as e:
        print("Fatal error in Lambda:", e)
        update_status(s3_key, "error", {"message": str(e)})


def update_status(media_id: str, status: str, extra: dict = None):
    """Write a row in the status table so frontend can poll progress."""
    item = {
        "mediaId": media_id,
        "status": status,
    }

    if status in ("success", "error", "no_bird", "unsupported_file"):
        item["ttl"] = int(time.time()) + 600

    if extra:
        item.update(extra)
    status_table.put_item(Item=item)

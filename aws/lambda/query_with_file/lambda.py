import os
import json
import tempfile
import boto3
import time
from boto3.dynamodb.conditions import Attr
from detection import detect_birds

# AWS clients
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

# Environment variables - Required from Lambda configuration
BUCKET_NAME = os.environ["BUCKET_NAME"]
RESULTS_TABLE_NAME = os.environ["RESULTS_TABLE_NAME"]
MEDIA_TABLE_NAME = os.environ["MEDIA_TABLE_NAME"]

results_table = dynamodb.Table(RESULTS_TABLE_NAME)
media_table = dynamodb.Table(MEDIA_TABLE_NAME)

def lambda_handler(event, context):
    print("[QUERY] Received S3 event:", json.dumps(event))

    try:
        record = event["Records"][0]
        s3_key = record["s3"]["object"]["key"]
        filename = os.path.basename(s3_key)
        ext = os.path.splitext(filename)[1].lower()

        if ext not in [".jpg", ".jpeg", ".png", ".mp4", ".mov", ".mkv", ".wav", ".mp3", ".flac", ".ogg", ".m4a", ".wma"]:
            write_status(s3_key, "unsupported_file")
            s3.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
            return

        write_status(s3_key, "processing")

        with tempfile.TemporaryDirectory() as tmpdir:
            local_path = os.path.join(tmpdir, filename)
            s3.download_file(BUCKET_NAME, s3_key, local_path)

            file_type, counts = detect_birds(local_path)
            print("[QUERY] Detection result:", file_type, counts)

        if not counts:
            write_status(s3_key, "no_bird")
            s3.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
            return

        detected_species = list(counts.keys())
        matching_links = set()

        for species in detected_species:
            scan_kwargs = {
                "FilterExpression": Attr("tags").contains(species),
                "ProjectionExpression": "#k, s3Url, thumbUrl, fileType",
                "ExpressionAttributeNames": {"#k": "mediaId"},
            }
            done = False
            start_key = None
            while not done:
                if start_key:
                    scan_kwargs["ExclusiveStartKey"] = start_key
                response = media_table.scan(**scan_kwargs)
                for item in response.get("Items", []):
                    url = item["thumbUrl"] if item.get("fileType") == "image" else item.get("s3Url")
                    if url:
                        matching_links.add(url.replace("s3://", f"https://{BUCKET_NAME}.s3.amazonaws.com/"))
                start_key = response.get("LastEvaluatedKey", None)
                done = start_key is None

        links = sorted(matching_links)
        suggested_species = sorted(detected_species)

        write_status(s3_key, "success", {
            "links": links,
            "suggestedSpecies": suggested_species
        })

        s3.delete_object(Bucket=BUCKET_NAME, Key=s3_key)

    except Exception as e:
        print("[QUERY] Error in Lambda:", e)
        write_status(s3_key, "error", {"message": str(e)})

def write_status(media_id: str, status: str, extra: dict = None):
    item = {
        "mediaId": media_id,
        "status": status,
        "ttl": int(time.time()) + 300  # auto-delete after 5 minutes
    }
    if extra:
        item.update(extra)
    results_table.put_item(Item=item)

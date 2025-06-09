import os
import json
import boto3

dynamodb = boto3.resource("dynamodb")
QUERY_RESULTS_TABLE_NAME = os.environ.get("QUERY_RESULTS_TABLE", "QueryDetectionResults")
results_table = dynamodb.Table(QUERY_RESULTS_TABLE_NAME)

#   actual S3 bucket name
S3_BUCKET = "birdtag-stack-media-bucket"

def lambda_handler(event, context):
    try:
        media_id = event.get("queryStringParameters", {}).get("mediaId")
        if not media_id:
            return response(400, {"status": "error", "message": "Missing mediaId"})

        result = results_table.get_item(Key={"mediaId": media_id})
        item = result.get("Item")

        if not item:
            return response(200, {"status": "pending"})

        status = item.get("status", "success")
        raw_links = item.get("links", [])
        suggested_species = item.get("suggestedSpecies", [])

        #  Fix S3 links: replace everything before the actual key with correct S3 base URL
        fixed_links = [fix_s3_url(link) for link in raw_links]

        if status == "success" and not fixed_links:
            return response(200, {
                "status": "success",
                "links": [],
                "suggestedSpecies": suggested_species,
                "message": "No similar species found in the database."
            })

        return response(200, {
            "status": status,
            "links": fixed_links,
            "suggestedSpecies": suggested_species
        })

    except Exception as e:
        print("Error in query_polling lambda:", e)
        return response(500, {"status": "error", "message": str(e)})

def fix_s3_url(link):
    # Extract the object key (e.g., thumb/abc.jpg or query_uploads/xyz.mp4)
    key_start = link.find("thumb/") if "thumb/" in link else link.find("query_uploads/")
    if key_start == -1:
        return link  # return as-is if format is unexpected
    key = link[key_start:]
    return f"https://{S3_BUCKET}.s3.amazonaws.com/{key}"

def response(code, body):
    return {
        "statusCode": code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(body)
    }

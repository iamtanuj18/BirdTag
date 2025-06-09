import os
import json
import boto3

dynamodb = boto3.resource("dynamodb")
STATUS_TABLE_NAME = os.environ.get("STATUS_TABLE_NAME", "BirdTagProcessingStatus")
status_table = dynamodb.Table(STATUS_TABLE_NAME)

def lambda_handler(event, context):
    try:
        media_id = event.get("queryStringParameters", {}).get("mediaId")
        if not media_id:
            return response(400, {"status": "error", "message": "Missing mediaId"})

        # Try to get the status entry
        result = status_table.get_item(Key={"mediaId": media_id})
        item = result.get("Item")

        if not item:
            # Still processing or not started yet
            return response(200, {"status": "pending"})

        # Return the existing status and metadata
        return response(200, item)

    except Exception as e:
        print("Error in polling lambda:", e)
        return response(500, {"status": "error", "message": str(e)})

def response(code, body):
    return {
        "statusCode": code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(body, default=str)
    }


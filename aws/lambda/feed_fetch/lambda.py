import os
import json
import boto3
from decimal import Decimal

# AWS clients
dynamodb = boto3.resource("dynamodb")

# Environment variables - Required from Lambda configuration
DDB_TABLE_NAME = os.environ["DDB_TABLE_NAME"]
BUCKET_NAME = os.environ["BUCKET_NAME"]

# DynamoDB table
table = dynamodb.Table(DDB_TABLE_NAME)


def decimal_default(obj):
    """JSON serializer for Decimal objects."""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def success_response(body):
    """Return successful API response with CORS headers."""
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
        "body": json.dumps(body, default=decimal_default)
    }


def error_response(code, message):
    """Return error API response with CORS headers."""
    return {
        "statusCode": code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
        "body": json.dumps({"status": "error", "message": message})
    }


def s3_to_https(s3_url):
    """
    Convert S3 URL to HTTPS format.
    
    Args:
        s3_url: S3 URI (s3://bucket/key) or existing HTTPS URL
    
    Returns:
        HTTPS URL to access the S3 object
    """
    if not s3_url:
        return None
    
    if s3_url.startswith("s3://"):
        key = s3_url.replace(f"s3://{BUCKET_NAME}/", "")
        return f"https://{BUCKET_NAME}.s3.amazonaws.com/{key}"
    return s3_url


def parse_tags(tags_string):
    """
    Parse tags JSON string to dictionary.
    
    Args:
        tags_string: JSON string containing tags
    
    Returns:
        Dictionary of tags or empty dict if parsing fails
    """
    try:
        return json.loads(tags_string) if tags_string else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def format_feed_item(item):
    """
    Format a DynamoDB item for feed display.
    
    Args:
        item: DynamoDB item containing media metadata
    
    Returns:
        Formatted dictionary for API response
    """
    tags_dict = parse_tags(item.get("tags", "{}"))
    
    # Determine media URL based on file type
    file_type = item.get("fileType", "")
    if file_type == "image":
        media_url = s3_to_https(item.get("thumbUrl"))
        full_size_url = s3_to_https(item.get("s3Url"))
    else:
        media_url = s3_to_https(item.get("s3Url"))
        full_size_url = media_url
    
    return {
        "mediaId": item.get("mediaId", ""),
        "fileType": file_type,
        "mediaUrl": media_url,
        "fullSizeUrl": full_size_url,
        "tags": tags_dict,
        "birdCount": int(item.get("birdCount", 0)),
        "uploadedBy": item.get("uploadedBy", "unknown"),
        "uploadedAt": int(item.get("uploadedAt", 0)),
    }


def get_feed(limit=9, offset=0):
    """
    Fetch feed items from DynamoDB sorted by uploadedAt (newest first).
    
    Args:
        limit: Number of items to return (default 9)
        offset: Number of items to skip for pagination (default 0)
    
    Returns:
        dict with items and pagination info
    """
    try:
        # Scan entire table to get all items
        all_items = []
        scan_kwargs = {}
        
        # Paginate through all items
        while True:
            response = table.scan(**scan_kwargs)
            all_items.extend(response.get("Items", []))
            
            # Check if there are more items to scan
            if "LastEvaluatedKey" not in response:
                break
            scan_kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]
        
        # Filter to only include successfully processed files with birds detected
        all_items = [
            item for item in all_items 
            if item.get("status") == "success" and int(item.get("birdCount", 0)) > 0
        ]
        
        # Sort all items by uploadedAt in descending order (newest first)
        sorted_items = sorted(
            all_items,
            key=lambda x: int(x.get("uploadedAt", 0)),
            reverse=True
        )
        
        # Apply pagination: skip offset items and take limit items
        total_count = len(sorted_items)
        paginated_items = sorted_items[offset:offset + limit]
        
        # Format items for feed display
        feed_items = [format_feed_item(item) for item in paginated_items]
        
        # Prepare response
        result = {
            "status": "success",
            "items": feed_items,
            "count": len(feed_items),
            "total": total_count,
            "hasMore": (offset + limit) < total_count,
        }
        
        return result
        
    except Exception as e:
        print(f"Error fetching feed: {str(e)}")
        raise


def lambda_handler(event, context):
    """
    Main Lambda handler for feed endpoint.
    
    Supports:
    - GET: Fetch feed items
    - OPTIONS: CORS preflight
    """
    print(f"Received event: {json.dumps(event)}")
    
    # Handle CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            "body": json.dumps({"message": "CORS preflight OK"})
        }
    
    try:
        # Parse request parameters
        query_params = event.get("queryStringParameters") or {}
        limit = int(query_params.get("limit", 9))
        offset = int(query_params.get("offset", 0))
        
        # Limit should be between 1 and 50, offset should be >= 0
        limit = max(1, min(limit, 50))
        offset = max(0, offset)
        
        # Fetch feed
        feed_data = get_feed(limit=limit, offset=offset)
        
        return success_response(feed_data)
        
    except ValueError as e:
        print(f"Validation error: {str(e)}")
        return error_response(400, str(e))
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return error_response(500, "Internal server error")

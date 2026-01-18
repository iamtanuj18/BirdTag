import json
import boto3
import os
from boto3.dynamodb.conditions import Key
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['BIRDMEDIA_TABLE_NAME'])
BUCKET_NAME = os.environ['BUCKET_NAME']

def decimal_default(obj):
    """JSON serializer for Decimal objects."""
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

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

def lambda_handler(event, context):
    try:
        # Get user email and pagination params from request
        query_params = event.get('queryStringParameters') or {}
        user_email = query_params.get('userEmail')
        limit = int(query_params.get('limit', 9))
        offset = int(query_params.get('offset', 0))
        
        # Limit should be between 1 and 9, offset should be >= 0
        limit = max(1, min(limit, 9))
        offset = max(0, offset)
        
        if not user_email:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                'body': json.dumps({'error': 'userEmail is required'})
            }
        
        # Query using GSI on uploadedBy
        response = table.query(
            IndexName='uploadedBy-index',
            KeyConditionExpression=Key('uploadedBy').eq(user_email),
            ScanIndexForward=False  # Sort by uploadedAt descending (newest first)
        )
        
        items = response.get('Items', [])
        
        # Separate items by status
        processing_items = []
        success_items = []
        failed_items = []
        
        for item in items:
            status = item.get('status', 'processing')
            
            # Parse tags JSON string to dictionary
            tags_dict = parse_tags(item.get('tags', '{}'))
            
            # Convert S3 URLs to HTTPS format
            file_type = item.get('fileType', '')
            if file_type == 'image':
                # Use thumbnail if available (success items), fallback to full-size (processing/failed)
                media_url = s3_to_https(item.get('thumbUrl')) or s3_to_https(item.get('s3Url'))
                full_size_url = s3_to_https(item.get('s3Url'))
            else:
                media_url = s3_to_https(item.get('s3Url'))
                full_size_url = media_url
            
            # Prepare item for frontend
            upload_item = {
                'mediaId': item.get('mediaId'),
                'filename': item.get('filename'),
                'fileType': file_type,
                'mediaUrl': media_url,
                'fullSizeUrl': full_size_url,
                'uploadedAt': int(item.get('uploadedAt', 0)),
                'status': status,
                'birdCount': int(item.get('birdCount', 0)),
                'tags': tags_dict,
                'errorMessage': item.get('errorMessage'),
                'uploadedBy': item.get('uploadedBy')
            }
            
            if status == 'processing':
                processing_items.append(upload_item)
            elif status == 'success':
                success_items.append(upload_item)
            else:  # no_bird, unsupported_file, error
                failed_items.append(upload_item)
        
        # Paginate success items
        total_success = len(success_items)
        paginated_success = success_items[offset:offset + limit]
        
        result = {
            'myMedia': {
                'items': paginated_success,
                'count': len(paginated_success),
                'total': total_success,
                'hasMore': (offset + limit) < total_success
            },
            'processing': processing_items,
            'failed': failed_items
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps(result, default=decimal_default)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({'error': str(e)})
        }
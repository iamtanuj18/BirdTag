import base64
import json
import os
import tempfile
import urllib.parse
from decimal import Decimal

import boto3
import jwt
import requests

from detection import detect_birds

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

S3_BUCKET_NAME = os.environ["S3_BUCKET_NAME"]
DYNAMODB_TABLE_NAME = os.environ["DYNAMODB_TABLE_NAME"]
COGNITO_USER_POOL_IDS = os.environ.get("COGNITO_USER_POOL_IDS", "").split(";")
COGNITO_REGION = os.environ.get("COGNITO_REGION")

media_table = dynamodb.Table(DYNAMODB_TABLE_NAME)

# Cache for Cognito JWKS
_jwks_cache = {}

def get_jwks(user_pool_id):
    """Fetch and cache Cognito JWKS (public keys for token validation)"""
    if user_pool_id in _jwks_cache:
        return _jwks_cache[user_pool_id]
    
    jwks_url = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{user_pool_id}/.well-known/jwks.json"
    response = requests.get(jwks_url)
    jwks = response.json()
    _jwks_cache[user_pool_id] = jwks
    return jwks

def validate_cognito_token(token):
    """
    Validate Cognito JWT token against all configured user pools.
    Returns user email if valid, raises exception if invalid.
    """
    # Remove 'Bearer ' prefix if present
    if token.startswith('Bearer '):
        token = token[7:]
    
    # Decode header to get kid (key ID)
    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header['kid']
    except Exception as e:
        raise ValueError(f"Invalid token header: {e}")
    
    # Try each user pool
    last_error = None
    for pool_id in COGNITO_USER_POOL_IDS:
        if not pool_id.strip():
            continue
            
        try:
            jwks = get_jwks(pool_id)
            
            # Find the correct key
            key = None
            for jwk in jwks.get('keys', []):
                if jwk['kid'] == kid:
                    # Convert JWK to PEM format for PyJWT
                    from cryptography.hazmat.primitives.asymmetric import rsa
                    from cryptography.hazmat.backends import default_backend
                    import base64
                    
                    # Extract modulus and exponent from JWK
                    n = int.from_bytes(base64.urlsafe_b64decode(jwk['n'] + '=='), 'big')
                    e = int.from_bytes(base64.urlsafe_b64decode(jwk['e'] + '=='), 'big')
                    
                    # Create RSA public key
                    public_numbers = rsa.RSAPublicNumbers(e, n)
                    key = public_numbers.public_key(default_backend())
                    break
            
            if not key:
                continue
            
            # Decode and verify token
            payload = jwt.decode(
                token,
                key,
                algorithms=['RS256'],
                options={
                    "verify_exp": True,
                    "verify_aud": False  # Skip audience verification
                }
            )
            
            user_email = payload.get('email', payload.get('cognito:username', 'unknown'))
            return user_email
            
        except jwt.ExpiredSignatureError:
            raise ValueError("Token has expired")
        except Exception as e:
            last_error = e
            continue
    
    # If we get here, token didn't validate against any pool
    raise ValueError(f"Token validation failed for all user pools: {last_error}")

def lambda_handler(event, context):
    """
    Main handler - accepts file via:
    1. Direct base64 upload (< 4MB)
    2. S3 key reference (> 4MB, already uploaded)
    """
    
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        headers = {k.lower(): v for k, v in event.get('headers', {}).items()}
        
        # Validate Cognito token
        auth_token = headers.get('authorization', '')
        if not auth_token:
            return response(401, {'error': 'Missing authorization token'})
        
        try:
            user_email = validate_cognito_token(auth_token)
        except ValueError as e:
            return response(403, {'error': f'Authentication failed: {str(e)}'})
        
        # Determine upload method and get file
        s3_key = None
        local_file_path = None
        
        if 'fileData' in body:
            file_data = body.get('fileData', '')
            file_ext = body.get('fileExt', '.jpg')
            
            if not file_data:
                return response(400, {'error': 'Missing fileData'})
            
            local_file_path = save_base64_to_temp(file_data, file_ext)
            
        elif 's3Key' in body:
            s3_key = body.get('s3Key', '')
            
            if not s3_key:
                return response(400, {'error': 'Missing s3Key'})
            
            # Download from S3
            local_file_path = download_from_s3(s3_key)
        else:
            return response(400, {'error': 'Must provide either fileData or s3Key'})
        
        file_type, detected_counts = detect_birds(local_file_path)
        
        if s3_key:
            try:
                s3.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
            except Exception as e:
                pass
        
        # Clean up local temp file
        try:
            os.unlink(local_file_path)
        except:
            pass
        
        # Scenario 1: No birds detected
        if not detected_counts or len(detected_counts) == 0:
            return response(200, {
                'status': 'no_birds',
                'message': 'No bird species were detected in the uploaded file. Please try using another file or search using "Search by Bird Name".',
                'detectedSpecies': [],
                'detectedCounts': {},
                'totalBirds': 0,
                'links': [],
                'matchingFiles': []
            })
        
        # Birds detected - query database for matching files
        detected_species = list(detected_counts.keys())
        total_birds = sum(detected_counts.values())
        
        matching_items = query_database_for_species(detected_species)
        
        # Scenario 2: Birds detected but no matching files in system
        if len(matching_items) == 0:
            species_info = ", ".join([f"{sp} ({cnt})" for sp, cnt in detected_counts.items()])
            return response(200, {
                'status': 'no_matches',
                'message': f'Species detected in your query file: {species_info}. Total birds: {total_birds}. However, no files with these species currently exist in the system.',
                'detectedSpecies': detected_species,
                'detectedCounts': detected_counts,
                'totalBirds': total_birds,
                'links': [],
                'matchingFiles': []
            })
        
        # Scenario 3: Birds detected AND matching files found
        formatted_results = format_results(matching_items)
        species_list = ", ".join(detected_species)
        
        return response(200, {
            'status': 'success',
            'message': f'Showing results for species: {species_list}',
            'detectedSpecies': detected_species,
            'detectedCounts': detected_counts,
            'totalBirds': total_birds,
            'links': [item['url'] for item in formatted_results],
            'matchingFiles': formatted_results,
            'totalMatches': len(formatted_results)
        })
        
    except Exception as e:
        
        if s3_key:
            try:
                s3.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
            except:
                pass
        
        return response(500, {
            'error': 'Internal server error',
            'message': str(e)
        })


def save_base64_to_temp(file_data_base64, file_ext):
    """Save base64 encoded file to temporary location."""
    try:
        decoded_data = base64.b64decode(file_data_base64)
        tmp_file = tempfile.NamedTemporaryFile(suffix=file_ext, delete=False)
        tmp_file.write(decoded_data)
        tmp_file.close()
        return tmp_file.name
    except Exception as e:
        raise


def download_from_s3(s3_key):
    """Download file from S3 to temporary location."""
    try:
        # Decode URL-encoded key
        s3_key = urllib.parse.unquote_plus(s3_key)
        
        # Determine file extension
        file_ext = os.path.splitext(s3_key)[1] or '.jpg'
        
        tmp_file = tempfile.NamedTemporaryFile(suffix=file_ext, delete=False)
        s3.download_file(S3_BUCKET_NAME, s3_key, tmp_file.name)
        tmp_file.close()
        return tmp_file.name
    except Exception as e:
        raise


def query_database_for_species(detected_species):
    """
    Query media table for files containing ANY of the detected species.
    Case-insensitive matching.
    """
    matching_items = []
    detected_lower = [sp.lower() for sp in detected_species]
    
    try:
        # Scan all items in media table
        items = scan_all_media()
        
        for item in items:
            # Only include successfully processed files
            if item.get('status') != 'success':
                continue
            
            # Parse tags JSON
            tags_json = item.get('tags', '{}')
            try:
                tags_dict = json.loads(tags_json)
            except:
                continue
            
            # Case-insensitive matching
            file_species_lower = [sp.lower() for sp in tags_dict.keys()]
            
            # Check if ANY detected species is in this file
            if any(detected_sp in file_species_lower for detected_sp in detected_lower):
                matching_items.append(item)
        
        return matching_items
        
    except Exception as e:
        return []


def scan_all_media():
    """Scan all items from media table."""
    items = []
    scan_kwargs = {}
    
    try:
        while True:
            response = media_table.scan(**scan_kwargs)
            items.extend(response.get('Items', []))
            
            last_key = response.get('LastEvaluatedKey')
            if not last_key:
                break
            scan_kwargs['ExclusiveStartKey'] = last_key
        
        return items
    except Exception as e:
        return []


def format_results(items):
    """Format database items for frontend response."""
    formatted = []
    
    for item in items:
        file_type = item.get('fileType', '')
        
        # Use thumbnail for images, full URL for video/audio
        if file_type == 'image' and item.get('thumbUrl'):
            url = item['thumbUrl']
        else:
            url = item.get('s3Url', '')
        
        # Convert s3:// to https://
        if url.startswith('s3://'):
            url = url.replace(f's3://{S3_BUCKET_NAME}/', f'https://{S3_BUCKET_NAME}.s3.amazonaws.com/')
        
        if url:
            # Parse tags
            tags_dict = {}
            try:
                tags_dict = json.loads(item.get('tags', '{}'))
            except:
                pass
            
            formatted.append({
                'url': url,
                'mediaId': item.get('mediaId', ''),
                'fileType': file_type,
                'tags': tags_dict,
                'uploadedBy': item.get('uploadedBy', 'unknown'),
                'uploadedAt': item.get('uploadedAt', 0)
            })
    
    return formatted


def response(status_code, body_dict):
    """Generate HTTP response without CORS headers (handled by Lambda Function URL)."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps(body_dict, cls=DecimalEncoder)
    }


class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle DynamoDB Decimal types."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            # Convert Decimal to int if it's a whole number, otherwise float
            if obj % 1 == 0:
                return int(obj)
            else:
                return float(obj)
        return super(DecimalEncoder, self).default(obj)

import os
import tempfile
import uuid

import boto3
from PIL import Image

s3 = boto3.client('s3')

def lambda_handler(event, context):

    bucket = event.get('bucket')
    key = event.get('key')

    if not bucket or not key:
        return {"error": "Invalid input"}

    if not key.lower().endswith(('.jpg', '.jpeg', '.png')):
        return {"error": "Not an image file"}

    # Generate unique thumbnail key
    thumb_id = str(uuid.uuid4())
    thumb_key = f"thumb/{thumb_id}.jpg"

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            download_path = os.path.join(tmpdir, 'input')
            thumbnail_path = os.path.join(tmpdir, 'thumb.jpg')

            s3.download_file(bucket, key, download_path)

            img = Image.open(download_path)
            img.thumbnail((256, 256))
            img.save(thumbnail_path, "JPEG", quality=85)

            s3.upload_file(thumbnail_path, bucket, thumb_key)

        return {"thumb_key": thumb_key}

    except Exception as e:
        return {"error": str(e)}

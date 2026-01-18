import boto3
import os
import tempfile
from PIL import Image
import uuid

s3 = boto3.client('s3')

def lambda_handler(event, context):
    print("Thumbnail Lambda triggered.")
    print(f"Event received: {event}")

    bucket = event.get('bucket')
    key = event.get('key')

    if not bucket or not key:
        print("Invalid event format: missing 'bucket' or 'key'")
        return {"error": "Invalid input"}

    if not key.lower().endswith(('.jpg', '.jpeg', '.png')):
        print(f"Skipping non-image file: {key}")
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
            print(f"Thumbnail saved to {thumb_key}")

        # Return thumbnail key back to tagger_lambda
        return {"thumb_key": thumb_key}

    except Exception as e:
        print(f"Thumbnail generation error: {str(e)}")
        return {"error": str(e)}

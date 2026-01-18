import os, json
import boto3
from urllib.parse import unquote_plus
from boto3.dynamodb.conditions import Attr

BUCKET_NAME = os.environ["BUCKET_NAME"]
DDB_TABLE_NAME = os.environ["DDB_TABLE_NAME"]
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN")

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
sns = boto3.client("sns")
table = dynamodb.Table(DDB_TABLE_NAME)

def success(body):
    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
        "body": json.dumps(body)
    }

def error(code, msg):
    return {
        "statusCode": code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
        "body": json.dumps({"status": "error", "message": msg})
    }

def send_sns_message(subject, message):
    if not SNS_TOPIC_ARN:
        return
    sns.publish(
        TopicArn=SNS_TOPIC_ARN,
        Subject=subject,
        Message=message
    )

def https_from_s3(s3_url: str) -> str:
    prefix = f"s3://{BUCKET_NAME}/"
    if s3_url.startswith(prefix):
        key = s3_url[len(prefix):]
    else:
        key = s3_url.replace("s3://", "")
    return f"https://{BUCKET_NAME}.s3.amazonaws.com/{key}"

def scan_all(**kwargs):
    items, resp = [], table.scan(**kwargs)
    items.extend(resp["Items"])
    while "LastEvaluatedKey" in resp:
        resp = table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"], **kwargs)
        items.extend(resp["Items"])
    return items

def get_item_by_thumb_https(thumb_https: str):
    s3_thumb = thumb_https.replace(f"https://{BUCKET_NAME}.s3.amazonaws.com/", f"s3://{BUCKET_NAME}/")
    items = scan_all(
        ProjectionExpression="#k, s3Url, thumbUrl, tags, fileType",
        FilterExpression=Attr("thumbUrl").eq(s3_thumb),
        ExpressionAttributeNames={"#k": "mediaId"},
    )
    return items[0] if items else None

def handle_query_by_species(payload):
    import difflib

    species = payload.get("species")
    match_mode = payload.get("matchMode", "OR")  # Default to OR
    limit = int(payload.get("limit", 9))  # Default 9 items per page
    offset = int(payload.get("offset", 0))  # Default start at 0
    
    if not species:
        return error(400, "Missing 'species' key")

    # Normalize species to lowercase for comparison
    search_species = [s.lower() for s in species]
    matched_items = []
    found_species = set()

    # Scan all items in DynamoDB
    for item in scan_all():
        tags = json.loads(item.get("tags", "{}"))
        item_species = [tag.lower() for tag in tags.keys()]
        
        if match_mode == "AND":
            # AND logic: file must contain ALL searched species
            if all(query_sp in item_species for query_sp in search_species):
                matched_items.append(item)
                found_species.update(tags.keys())
        else:
            # OR logic: file must contain AT LEAST ONE searched species
            if any(query_sp in item_species for query_sp in search_species):
                matched_items.append(item)
                found_species.update(tags.keys())

    # No matches found - suggest similar species
    if not matched_items:
        all_species = sorted(set(k for item in scan_all() for k in json.loads(item.get("tags", "{}")).keys()))
        suggestions = []
        for q in species:
            suggestions.extend(difflib.get_close_matches(q, all_species, n=1, cutoff=0.5))
        return success({
            "status": "noMatch",
            "suggestedSpecies": list(set(suggestions)),
            "items": [],
            "total": 0,
            "hasMore": False
        })

    # Sort by uploadedAt (newest first)
    matched_items.sort(key=lambda x: int(x.get("uploadedAt", 0)), reverse=True)
    
    # Apply pagination
    total_count = len(matched_items)
    paginated_items = matched_items[offset:offset + limit]
    
    # Format items for response (similar to feed)
    formatted_items = []
    for item in paginated_items:
        tags_dict = json.loads(item.get("tags", "{}"))
        file_type = item.get("fileType", "")
        
        if file_type == "image":
            media_url = https_from_s3(item.get("thumbUrl"))
            full_size_url = https_from_s3(item.get("s3Url"))
        else:
            media_url = https_from_s3(item.get("s3Url"))
            full_size_url = media_url
        
        formatted_items.append({
            "mediaId": item.get("mediaId", ""),
            "fileType": file_type,
            "mediaUrl": media_url,
            "fullSizeUrl": full_size_url,
            "tags": tags_dict,
            "birdCount": int(item.get("birdCount", 0)),
            "uploadedBy": item.get("uploadedBy", "unknown"),
            "uploadedAt": int(item.get("uploadedAt", 0)),
        })

    return success({
        "status": "success",
        "items": formatted_items,
        "count": len(formatted_items),
        "total": total_count,
        "hasMore": (offset + limit) < total_count,
        "matchedSpecies": list(found_species)
    })

def handle_list_species():
    species_set = set()
    for item in scan_all():
        tags = json.loads(item.get("tags", "{}"))
        species_set.update(tags.keys())
    return success({"status": "success", "species": list(sorted(species_set))})

def handle_query_by_thumbnail(payload):
    thumb_url = payload.get("thumbnailUrl")
    if not thumb_url:
        return error(400, "Missing 'thumbnailUrl'")
    item = get_item_by_thumb_https(thumb_url)
    if not item:
        return error(404, "File not found.")
    return success({"status": "success", "fullSizeUrl": https_from_s3(item["s3Url"])})

def handle_modify_tags(payload):
    operation = payload.get("operation")
    mods = payload.get("modifications", [])

    if operation not in [0, 1]:
        return error(400, "Invalid 'operation'")

    success_list = []
    failed = []
    sns_logs = []

    for mod in mods:
        url = mod.get("url")
        tag_inputs = mod.get("tags", [])
        tag_updates = {}
        for t in tag_inputs:
            try:
                name, *cnt = t.split(",")
                tag_updates[name.strip().lower()] = int(cnt[0]) if cnt else 1
            except ValueError:
                failed.append({"url": url, "error": f"Invalid tag: {t}"})
                continue

        item = (
            get_item_by_thumb_https(url)
            if "/thumb/" in url
            else table.get_item(Key={"mediaId": unquote_plus(url.split(f"https://{BUCKET_NAME}.s3.amazonaws.com/")[-1])}).get("Item")
        )
        if not item:
            failed.append({"url": url, "error": "File not found"})
            continue

        original_tags = {k.lower(): v for k, v in json.loads(item.get("tags", "{}")).items()}
        tags = original_tags.copy()

        if operation == 0:  # REMOVE
            for k, v in tag_updates.items():
                if k not in tags:
                    failed.append({"url": url, "error": f"Cannot remove '{k}' — tag not found"})
                    break
                if tags[k] < v:
                    failed.append({"url": url, "error": f"Cannot remove {v} '{k}' — only {tags[k]} present"})
                    break
            else:
                for k, v in tag_updates.items():
                    tags[k] -= v
                    if tags[k] == 0:
                        del tags[k]
        else:  # ADD
            for k, v in tag_updates.items():
                tags[k] = tags.get(k, 0) + v

        if url in [f["url"] for f in failed]:
            continue

        item["tags"] = json.dumps(tags)
        item["birdCount"] = sum(tags.values())

        deleted_due_to_zero = False
        if not tags:
            s3.delete_object(Bucket=BUCKET_NAME, Key=item["mediaId"])
            s3.delete_object(Bucket=BUCKET_NAME, Key=item["thumbUrl"].replace("s3://", ""))
            table.delete_item(Key={"mediaId": item["mediaId"]})
            deleted_due_to_zero = True
        else:
            table.put_item(Item=item)

        success_list.append(url)
        if deleted_due_to_zero:
            sns_logs.append(f"{url}\n  ➞ All tags removed. File was deleted.")
        else:
            diff = []
            for k in tag_updates:
                old = original_tags.get(k, 0)
                new = tags.get(k, 0)
                if operation == 0:
                    diff.append(f"  ❌ Removed {old - new} of '{k}' (now: {new})")
                else:
                    diff.append(f"  ✅ Added {new - old} of '{k}' (now: {new})")
            sns_logs.append(f"{url}\n" + "\n".join(diff))

    if sns_logs:
        send_sns_message(
            "BirdTag Update Notification",
            "The following files had tag modifications:\n\n" + "\n\n".join(sns_logs)
        )

    return success({
        "updated": success_list,
        "errors": failed
    })


def handle_delete_files(payload):
    urls = payload.get("urls", [])
    deleted = []
    logs = []
    for url in urls:
        path = url.split(f"https://{BUCKET_NAME}.s3.amazonaws.com/")[-1]
        if path.startswith("thumb/"):
            item = get_item_by_thumb_https(url)
            if not item:
                continue
            tags = json.loads(item.get("tags", "{}"))
            s3.delete_object(Bucket=BUCKET_NAME, Key=path)
            s3.delete_object(Bucket=BUCKET_NAME, Key=item["mediaId"])
            table.delete_item(Key={"mediaId": item["mediaId"]})
        else:
            media_key = path
            item = table.get_item(Key={"mediaId": media_key}).get("Item")
            tags = json.loads(item.get("tags", "{}")) if item else {}
            if item and item.get("thumbUrl"):
                thumb_key = item["thumbUrl"].replace("s3://", "")
                s3.delete_object(Bucket=BUCKET_NAME, Key=thumb_key)
            s3.delete_object(Bucket=BUCKET_NAME, Key=media_key)
            table.delete_item(Key={"mediaId": media_key})
        deleted.append(url)
        logs.append(f"{url}\n  Tags before deletion: {tags}")

    if logs:
        send_sns_message(
            "BirdTag Deletion Notification",
            "The following files were deleted:\n\n" + "\n\n".join(logs)
        )

    return success({"status": "success", "deleted": deleted})

def handle_query_by_tags(payload):
    tags = payload.get("tags")
    limit = int(payload.get("limit", 9))  # Default 9 items per page
    offset = int(payload.get("offset", 0))  # Default start at 0
    
    if not tags:
        return error(400, "Missing 'tags' key")
    
    # Validate that all counts are positive integers
    for species, required_count in tags.items():
        if not isinstance(required_count, int) or required_count < 1:
            return error(400, f"Invalid count for '{species}': must be a positive integer (minimum 1)")

    matched_items = []
    
    # Scan all items and match based on minimum count requirements
    for item in scan_all():
        item_tags = json.loads(item.get("tags", "{}"))
        match = True
        
        # Check if item has at least the required count for each species
        for species, required_count in tags.items():
            actual_count = item_tags.get(species, 0)
            if actual_count < required_count:
                match = False
                break
        
        if match:
            matched_items.append(item)

    # No matches found
    if not matched_items:
        return success({
            "status": "noMatch",
            "items": [],
            "total": 0,
            "hasMore": False
        })

    # Sort by uploadedAt (newest first)
    matched_items.sort(key=lambda x: int(x.get("uploadedAt", 0)), reverse=True)
    
    # Apply pagination
    total_count = len(matched_items)
    paginated_items = matched_items[offset:offset + limit]
    
    # Format items for response (similar to feed and FindByBird)
    formatted_items = []
    for item in paginated_items:
        tags_dict = json.loads(item.get("tags", "{}"))
        file_type = item.get("fileType", "")
        
        if file_type == "image":
            media_url = https_from_s3(item.get("thumbUrl"))
            full_size_url = https_from_s3(item.get("s3Url"))
        else:
            media_url = https_from_s3(item.get("s3Url"))
            full_size_url = media_url
        
        formatted_items.append({
            "mediaId": item.get("mediaId", ""),
            "fileType": file_type,
            "mediaUrl": media_url,
            "fullSizeUrl": full_size_url,
            "tags": tags_dict,
            "birdCount": int(item.get("birdCount", 0)),
            "uploadedBy": item.get("uploadedBy", "unknown"),
            "uploadedAt": int(item.get("uploadedAt", 0)),
        })

    return success({
        "status": "success",
        "items": formatted_items,
        "count": len(formatted_items),
        "total": total_count,
        "hasMore": (offset + limit) < total_count
    })

def lambda_handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            "body": json.dumps({"status": "success", "message": "CORS preflight OK"})
        }

    body = event.get("body")
    if not body:
        return error(400, "No body")

    payload = json.loads(body)
    query_type = payload.get("queryType")

    if query_type == "byTags":
        return handle_query_by_tags(payload)
    if query_type == "bySpecies":
        return handle_query_by_species(payload)
    if query_type == "byThumbnailUrl":
        return handle_query_by_thumbnail(payload)
    if query_type == "modifyTags":
        return handle_modify_tags(payload)
    if query_type == "deleteFiles":
        return handle_delete_files(payload)
    if query_type == "listSpecies":
        return handle_list_species()

    return error(400, f"Unknown queryType: {query_type}")
# BirdTag API Endpoints

This document describes all API endpoints used by the BirdTag application and their corresponding Lambda functions.

## Base URL
All endpoints are prefixed with: `${config.apiGateway.url}`

---

## 1. Query Raw - Multi-Purpose Query Endpoint
**Endpoint:** `/query_raw`  
**Method:** `POST`  
**Lambda:** `aws/lambda/query-media-files/lambda.py`

This endpoint handles multiple query types through a `queryType` parameter.

### 1.1 List All Species
**Request:**
```json
{
  "queryType": "listSpecies"
}
```

**Response:**
```json
{
  "status": "success",
  "species": ["species1", "species2", ...]
}
```

**Used by:**
- FindByBird page
- FindByTag page
- ModifyTags page

---

### 1.2 Search by Species (Bird Name)
**Request:**
```json
{
  "queryType": "bySpecies",
  "species": ["kingfisher", "sparrow"],
  "matchMode": "OR",  // "OR" or "AND"
  "limit": 9,
  "offset": 0
}
```

**Response:**
```json
{
  "status": "success",
  "items": [
    {
      "mediaId": "string",
      "fileType": "image|video|audio",
      "mediaUrl": "https://...",
      "fullSizeUrl": "https://...",
      "tags": {"species1": 2, "species2": 1},
      "birdCount": 3,
      "uploadedBy": "email",
      "uploadedAt": 1234567890
    }
  ],
  "count": 9,
  "total": 45,
  "hasMore": true,
  "matchedSpecies": ["species1", "species2"]
}
```

**Used by:** FindByBird page

---

### 1.3 Search by Tags (Species + Minimum Count)
**Request:**
```json
{
  "queryType": "byTags",
  "tags": {
    "kingfisher": 2,
    "sparrow": 1
  },
  "limit": 9,
  "offset": 0
}
```

**Response:**
```json
{
  "status": "success",
  "items": [...],  // Same format as bySpecies
  "count": 9,
  "total": 45,
  "hasMore": true
}
```

**Used by:** FindByTag page

---

### 1.4 Modify Tags (Edit Species)
**Request:**
```json
{
  "queryType": "modifyTags",
  "mode": "replace",
  "url": "https://bucket.s3.amazonaws.com/path/to/file.jpg",
  "tags": ["kingfisher,3", "sparrow,2"]
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Tags updated successfully"
}
```

**Response (File Deleted - All Species Removed):**
```json
{
  "status": "success",
  "message": "File deleted (all species removed)"
}
```

**Backend Behavior:**
- Replaces all existing tags with the new set
- If `tags` array is empty, deletes the file and metadata from S3 + DynamoDB
- Sends SNS notification with before/after comparison

**Used by:** ModifyTags page

---

### 1.5 Delete Files
**Request:**
```json
{
  "queryType": "deleteFiles",
  "urls": [
    "https://bucket.s3.amazonaws.com/path/to/file1.jpg",
    "https://bucket.s3.amazonaws.com/path/to/file2.mp4"
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "deleted": [
    "https://bucket.s3.amazonaws.com/path/to/file1.jpg",
    "https://bucket.s3.amazonaws.com/path/to/file2.mp4"
  ]
}
```

**Backend Behavior:**
- Deletes files from S3 (both original and thumbnail if exists)
- Removes metadata from DynamoDB
- Sends SNS notification with deleted file info

**Used by:** ModifyTags page (Delete File button)

---

## 2. My Media - User's Uploaded Files
**Endpoint:** `/my-media`  
**Method:** `GET`  
**Query Parameters:**
- `userEmail` (required): User's email from auth context
- `limit` (default: 9): Items per page
- `offset` (default: 0): Pagination offset

**Lambda:** `aws/lambda/my-uploaded-files/lambda.py`

**Response:**
```json
{
  "myMedia": {
    "items": [
      {
        "mediaId": "string",
        "fileType": "image|video|audio",
        "mediaUrl": "https://...",
        "fullSizeUrl": "https://...",
        "tags": {"species1": 2},
        "birdCount": 2,
        "uploadedBy": "email",
        "uploadedAt": 1234567890
      }
    ],
    "total": 45,
    "hasMore": true
  },
  "processing": [...],  // Files still being processed
  "failed": [...]       // Files that failed processing
}
```

**Used by:**
- MyMedia page
- ModifyTags page

---

## 3. Feed Fetch - Community Feed
**Endpoint:** `/feed`  
**Method:** `GET`  
**Query Parameters:**
- `limit` (default: 10): Items per page
- `offset` (default: 0): Pagination offset

**Lambda:** `aws/lambda/feed-fetch/lambda.py`

**Response:**
```json
{
  "items": [...],  // Same format as /my-media items
  "total": 150,
  "hasMore": true
}
```

**Used by:** HomePage (feed display)

---

## 4. Query with File - Search by Uploading Image/Video
**Endpoint:** `/query-with-file`  
**Method:** `POST`  
**Content-Type:** `multipart/form-data`

**Lambda:** `aws/lambda/query-with-file/lambda.py`

**Request (FormData):**
- `file`: Image/video file to analyze
- `matchMode`: "OR" or "AND"
- `limit`: Number (default: 9)
- `offset`: Number (default: 0)

**Response:**
```json
{
  "status": "success",
  "detectedSpecies": ["species1", "species2"],
  "items": [...],  // Matching files from database
  "total": 20,
  "hasMore": false
}
```

**Backend Behavior:**
1. Runs YOLO model on uploaded file
2. Detects bird species
3. Searches database for files with same species
4. Returns matching results with pagination

**Used by:** FindByFile page

---

## 5. S3 Presigned Upload URL
**Endpoint:** `/upload-url`  
**Method:** `POST`

**Lambda:** `aws/lambda/s3-presigned-upload-url/lambda.mjs`

**Request:**
```json
{
  "fileName": "my-bird.jpg",
  "fileType": "image/jpeg"
}
```

**Response:**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/presigned-url...",
  "fileKey": "uploads/uuid-my-bird.jpg"
}
```

**Used by:** File upload functionality

---

## Summary by Frontend Page

| Page | Endpoints Used |
|------|----------------|
| **FindByBird** | `/query_raw` (listSpecies, bySpecies) |
| **FindByTag** | `/query_raw` (listSpecies, byTags) |
| **FindByFile** | `/query-with-file` |
| **MyMedia** | `/my-media` |
| **ModifyTags** | `/my-media`, `/query_raw` (listSpecies, modifyTags, deleteFiles) |
| **HomePage** | `/feed` |

---

## Notes

### Removed Endpoints
- `/delete-file` - Functionality merged into `/query_raw` with `queryType: "deleteFiles"`
- `/modify-tags` - Functionality merged into `/query_raw` with `queryType: "modifyTags"`
- `/delete-by-url` - Page removed, functionality available through ModifyTags

### Authentication
All endpoints require `Authorization` header with ID token from Cognito:
```
Authorization: <id_token>
```

### CORS
All endpoints support CORS with:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: Content-Type,Authorization`
- `Access-Control-Allow-Methods: OPTIONS,POST,GET`

### Pagination
Endpoints with pagination use:
- `limit`: Number of items per page (default: 9)
- `offset`: Starting position (default: 0)
- Response includes: `total` (total count), `hasMore` (boolean)

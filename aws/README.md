# AWS Lambda Functions - BirdTag Backend

This directory contains all AWS Lambda functions that power the BirdTag serverless backend.

## Architecture Overview

BirdTag uses a microservices architecture with 9 Lambda functions handling different operations:
- **2 ECR-based Lambdas** (Docker containers for ML models)
- **6 ZIP-based Lambdas** (lightweight Python functions)
- **1 ZIP-based Lambda** (Node.js for presigned URLs)

## Lambda Functions

### 1. presigned_url (Node.js - ZIP deployment)
**Purpose**: Generate S3 presigned URLs for client-side uploads

**Runtime**: Node.js 18.x  
**Memory**: 256 MB  
**Timeout**: 10 seconds  
**Trigger**: API Gateway POST `/presignedurl`

**Dependencies**:
```json
{
  "@aws-sdk/client-s3": "^3.x",
  "@aws-sdk/s3-request-presigner": "^3.x"
}
```

**Environment Variables**:
- `S3_BUCKET_NAME`: Target S3 bucket name
- `AWS_REGION`: AWS region

**Deployment**:
```bash
cd presigned_url
npm install
zip -r function.zip .
aws lambda update-function-code --function-name presigned_url --zip-file fileb://function.zip
```

---

### 2. species_detection (Python - ECR deployment)
**Purpose**: S3-triggered AI detection using YOLOv8 and BirdNET

**Runtime**: Python 3.12 (Docker container)  
**Memory**: 3008 MB  
**Timeout**: 180 seconds (3 minutes)  
**Trigger**: S3 Event (uploads/)

**Dependencies**:
- `ultralytics` (YOLOv8)
- `birdnet` (audio detection)
- `opencv-python-headless`
- `supervision`
- `boto3`

**Environment Variables**:
- `S3_BUCKET_NAME`: S3 bucket name
- `DYNAMODB_TABLE_NAME`: DynamoDB table
- `THUMBNAIL_LAMBDA_ARN`: ARN of thumbnail Lambda
- `SNS_TOPIC_ARN`: SNS topic for notifications
- `BUCKET_NAME`: Bucket with model.pt
- `MODEL_S3_PATH`: Path to YOLOv8 model (e.g., models/model.pt)

**Deployment**: ECR (Docker container)
```bash
cd species_detection
docker build -t species-detection .
# Push to ECR and update Lambda (see deployment guide)
```

**Notes**:
- Model weights (`model.pt`) must be uploaded to S3 at `s3://<bucket>/models/model.pt`
- BirdNET model auto-downloads at runtime (~200MB, cached in /tmp)

---

### 3. file_query (Python - ECR deployment)
**Purpose**: Reverse image/video/audio search using AI detection

**Runtime**: Python 3.12 (Docker container)  
**Memory**: 3008 MB  
**Timeout**: 180 seconds  
**Trigger**: API Gateway POST `/file_query`

**Dependencies**:
- Same as `species_detection` (YOLOv8, BirdNET)
- `PyJWT` (token validation)
- `cryptography` (JWKS parsing)
- `requests`

**Environment Variables**:
- `S3_BUCKET_NAME`: S3 bucket name
- `DYNAMODB_TABLE_NAME`: DynamoDB table
- `COGNITO_USER_POOL_IDS`: Semicolon-separated pool IDs
- `COGNITO_REGION`: Cognito region
- `BUCKET_NAME`: Bucket with model.pt
- `MODEL_S3_PATH`: Path to YOLOv8 model

**Deployment**: ECR (Docker container)
```bash
cd file_query
docker build -t file-query .
# Push to ECR and update Lambda (same as species_detection)
```

**Notes**:
- Handles both base64 uploads (<4MB) and S3 key references (>4MB)
- Query files uploaded to `query_uploads/` are deleted after processing

---

### 4. feed_fetch (Python - ZIP deployment)
**Purpose**: Retrieve paginated community feed

**Runtime**: Python 3.12  
**Memory**: 256 MB  
**Timeout**: 30 seconds  
**Trigger**: API Gateway GET `/feed`

**Dependencies**:
```
boto3>=1.35.x
```

**Environment Variables**:
- `S3_BUCKET_NAME`: S3 bucket name
- `DYNAMODB_TABLE_NAME`: DynamoDB table

**Deployment**:
```bash
cd feed_fetch
pip install -t . boto3
zip -r function.zip .
aws lambda update-function-code --function-name feed_fetch --zip-file fileb://function.zip
```

---

### 5. my_uploaded_files (Python - ZIP deployment)
**Purpose**: Retrieve user's uploaded files with status tracking

**Runtime**: Python 3.12  
**Memory**: 256 MB  
**Timeout**: 30 seconds  
**Trigger**: API Gateway GET `/my_uploaded_files`

**Dependencies**:
```
boto3>=1.35.x
PyJWT>=2.x
cryptography>=41.x
requests>=2.x
```

**Environment Variables**:
- `S3_BUCKET_NAME`: S3 bucket name
- `DYNAMODB_TABLE_NAME`: DynamoDB table
- `COGNITO_USER_POOL_IDS`: Semicolon-separated pool IDs
- `COGNITO_REGION`: Cognito region

**Deployment**:
```bash
cd my_uploaded_files
pip install -t . boto3 PyJWT cryptography requests
zip -r function.zip .
aws lambda update-function-code --function-name my_uploaded_files --zip-file fileb://function.zip
```

---

### 6. generate_thumbnail (Python - ZIP deployment)
**Purpose**: Create 256x256 thumbnails for uploaded images

**Runtime**: Python 3.12  
**Memory**: 512 MB  
**Timeout**: 30 seconds  
**Trigger**: Invoked synchronously by `species_detection`

**Dependencies**:
```
boto3>=1.35.x
Pillow>=10.x
```

**Environment Variables**:
- `S3_BUCKET_NAME`: S3 bucket name

**Deployment**:
```bash
cd generate_thumbnail
pip install -t . boto3 Pillow
zip -r function.zip .
aws lambda update-function-code --function-name generate_thumbnail --zip-file fileb://function.zip
```

---

### 7. email_auto_verify (Python - ZIP deployment)
**Purpose**: Cognito trigger to auto-verify user emails (skip OTP)

**Runtime**: Python 3.12  
**Memory**: 128 MB  
**Timeout**: 5 seconds  
**Trigger**: Cognito Pre-signup trigger

**Dependencies**: None (Python standard library only)

**Deployment**:
```bash
cd email_auto_verify
zip function.zip index.py
aws lambda update-function-code --function-name email_auto_verify --zip-file fileb://function.zip
```

**Cognito Configuration**: Add as Pre-signup trigger in Cognito console

---

### 8. sns_auto_signup (Python - ZIP deployment)
**Purpose**: Cognito trigger to auto-subscribe users to SNS topic

**Runtime**: Python 3.12  
**Memory**: 128 MB  
**Timeout**: 10 seconds  
**Trigger**: Cognito Post-confirmation trigger

**Dependencies**:
```
boto3>=1.35.x
```

**Environment Variables**:
- `SNS_TOPIC_ARN`: SNS topic ARN for bird detection notifications

**Deployment**:
```bash
cd sns_auto_signup
pip install -t . boto3
zip -r function.zip .
aws lambda update-function-code --function-name sns_auto_signup --zip-file fileb://function.zip
```

**Cognito Configuration**: Add as Post-confirmation trigger in Cognito console

---

### 9. query_media_files (Python - ZIP deployment)
**Purpose**: Handle species search, tag modifications, and species listing

**Runtime**: Python 3.12  
**Memory**: 512 MB  
**Timeout**: 30 seconds  
**Trigger**: API Gateway POST `/query_raw`

**Dependencies**:
```
boto3>=1.35.x
```

**Environment Variables**:
- `S3_BUCKET_NAME`: S3 bucket name
- `DYNAMODB_TABLE_NAME`: DynamoDB table
- `SNS_TOPIC_ARN`: SNS topic for tag modification notifications

**Deployment**:
```bash
cd query_media_files
pip install -t . boto3
zip -r function.zip .
aws lambda update-function-code --function-name query_media_files --zip-file fileb://function.zip
```

**Supported Operations**:
- `queryType: "bySpecies"` - Search by species with OR/AND logic
- `queryType: "listSpecies"` - Get all available species
- `queryType: "modifyTag"` - Update species tags
- `queryType: "byThumbnail"` - Get full-size URL from thumbnail

---

## Infrastructure Requirements

### S3 Buckets
Create a single S3 bucket with the following folder structure:
```
your-bucket/
├── uploads/          # User-uploaded media (S3 event trigger)
├── thumb/            # Generated thumbnails
├── models/           # YOLOv8 model weights (model.pt)
├── query_uploads/    # Temporary reverse search uploads
└── test-files/       # Public test media for downloads
```

### S3 Event Configuration
Configure S3 event notification:
- Event: `s3:ObjectCreated:*`
- Prefix: `uploads/`
- Lambda: `species_detection`
```

### DynamoDB Table
Create a table with the following schema:
```bash
aws dynamodb create-table \
  --table-name BirdTagMedia \
  --attribute-definitions AttributeName=mediaId,AttributeType=S \
  --key-schema AttributeName=mediaId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

**Attributes**:
- `mediaId` (String, Primary Key): S3 key of uploaded file
- `uploadedBy` (String): User email
- `uploadedAt` (Number): Unix timestamp
- `status` (String): `processing`, `success`, `no_bird`, `error`, `unsupported_file`
- `tags` (String): JSON-encoded species counts `{"Crow": 2, "Sparrow": 1}`
- `birdCount` (Number): Total bird count
- `fileType` (String): `image`, `video`, `audio`
- `s3Url` (String): Full S3 URL
- `thumbUrl` (String): Thumbnail S3 URL (images only)
- `ttl` (Number): Auto-deletion timestamp (failed files only)

### SNS Topic
```bash
aws sns create-topic --name BirdDetectionNotifications
```

### Cognito User Pool
```bash
# Create user pool with email as username
aws cognito-idp create-user-pool --pool-name BirdTagUsers \
  --username-attributes email \
  --auto-verified-attributes email

# Add Lambda triggers
aws cognito-idp update-user-pool --user-pool-id <pool-id> \
  --lambda-config PreSignUp=<email-auto-verify-arn>,PostConfirmation=<sns-auto-signup-arn>
```

### API Gateway
Create a REST API with the following routes:
- `POST /presignedurl` → presigned_url Lambda
- `GET /feed` → feed_fetch Lambda
- `POST /query_raw` → query_media_files Lambda
- `POST /file_query` → file_query Lambda
- `GET /my_uploaded_files` → my_uploaded_files Lambda

Enable CORS on all routes.

---

## IAM Permissions

### Lambda Execution Role (species_detection, file_query)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:PutObjectTagging"
      ],
      "Resource": "arn:aws:s3:::your-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:region:account:table/BirdTagMedia"
    },
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:region:account:function:generate_thumbnail"
    },
    {
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:region:account:BirdDetectionNotifications"
    }
  ]
}
```

### Lambda Execution Role (other functions)
Adjust based on specific function needs (S3, DynamoDB, SNS access).

---

## Monitoring & Logs

All Lambda functions log to CloudWatch Logs:
```bash
# View logs for a function
aws logs tail /aws/lambda/species_detection --follow

# Check invocation errors
aws logs filter-log-events --log-group-name /aws/lambda/species_detection --filter-pattern "ERROR"
```

**Metrics to monitor**:
- Invocation count
- Error rate
- Duration (watch for cold starts on ECR Lambdas)
- Throttles
- Concurrent executions

---

## Cost Optimization

- **Lambda**: Use ARM64 architecture for 20% cost savings
- **S3**: Enable Intelligent-Tiering for uploads
- **DynamoDB**: PAY_PER_REQUEST billing for variable traffic
- **ECR**: Use multi-stage Docker builds to minimize image size
- **CloudWatch**: Set log retention to 7-14 days

---

## Troubleshooting

### Common Issues

**1. Lambda timeout on species_detection**
- Increase timeout to 180 seconds
- Increase memory to 3008 MB
- Check YOLOv8 model size (should be <50MB)

**2. BirdNET model download fails**
- Increase memory to 3008 MB
- Increase timeout to 180 seconds
- Check /tmp disk space (10GB limit)

**3. Presigned URL expired**
- URLs expire after 5 minutes
- Client must upload immediately after generation

**4. DynamoDB throttling**
- Switch to PAY_PER_REQUEST billing mode
- Check for scan operations without filters

**5. CORS errors**
- Enable CORS on API Gateway
- Add proper headers in Lambda responses

---

## Development Workflow

### Local Testing
```bash
# Test Lambda functions locally using AWS SAM
sam local invoke species_detection -e events/s3-event.json

# Start local API Gateway
sam local start-api
```

### CI/CD Deployment
```bash
# Automated deployment script
./deploy.sh production
```

## Security

- Use environment variables for all secrets
- Enable VPC for database access (if using RDS)
- Rotate Cognito client secrets regularly
- Use S3 bucket policies to restrict access
- Enable CloudTrail for audit logging
- Use KMS encryption for S3 and DynamoDB

## Model Deployment

### YOLOv8 Model Upload
```bash
# Upload model to S3
aws s3 cp models/yolov8/model.pt s3://your-bucket/models/model.pt

# Verify upload
aws s3 ls s3://your-bucket/models/
```

### BirdNET Model
BirdNET automatically downloads the model at runtime. No manual upload required.

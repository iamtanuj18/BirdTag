# YOLOv8 Model

This directory contains the YOLOv8 model weights (`model.pt`) used for bird species detection in images and videos.

## Model Details

- **Architecture**: YOLOv8 (You Only Look Once v8)
- **File**: `model.pt`
- **Confidence Threshold**: 50%
- **Supported Species**: 7 bird species
  - Crow
  - Kingfisher
  - Myna
  - Owl
  - Peacock
  - Pigeon
  - Sparrow

## Usage

The model is uploaded to AWS S3 (`s3://your-bucket/models/model.pt`) and downloaded at runtime by the Lambda functions:
- `species_detection`
- `file_query`

## Training

This model was fine-tuned on a custom dataset of bird images for accurate species classification in the Indian subcontinent region.

## File Size

18.3 MB (YOLOv8s small variant optimized for accuracy)

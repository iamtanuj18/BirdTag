# BirdNET Model

This directory is intentionally empty - the BirdNET model is automatically downloaded at runtime.

## Model Details

- **Library**: BirdNET v0.1.7
- **Type**: Audio-based bird species detection
- **Confidence Threshold**: 70%
- **Supported Species**: 6,000+ global bird species
- **Auto-download**: Model weights are fetched automatically on first Lambda invocation

## How It Works

The Lambda functions use the `birdnet` Python package, which handles model download and caching:

```python
from birdnet import predict_species_within_audio_file, SpeciesPredictions
```

On first execution, the package downloads the model to `/tmp/` in the Lambda environment. Subsequent invocations use the cached model until the Lambda container is recycled.

## Supported Audio Formats

- WAV
- MP3
- FLAC
- OGG
- M4A
- WMA

Audio files are automatically converted to mono 16kHz format using FFmpeg before processing.

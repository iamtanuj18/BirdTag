import os
import boto3
from pathlib import Path
from collections import defaultdict
import subprocess

# Runtime safe dirs - Must be set BEFORE importing ultralytics
os.environ["MPLCONFIGDIR"] = "/tmp"
os.environ["YOLO_CONFIG_DIR"] = "/tmp"
os.environ["ULTRALYTICS_CONFIG_DIR"] = "/tmp"

# Globals
_YOLO = None
_YOLO_NAMES = {}

def convert_to_mono(input_path: str, output_path: str):
    try:
        subprocess.run([
            "ffmpeg", "-y",
            "-i", input_path,
            "-ac", "1",
            "-ar", "16000",
            "-sample_fmt", "s16",
            output_path
        ], check=True)
        return output_path
    except Exception as e:
        return input_path

def _load_yolo():
    """Download & load YOLO model from S3 into /tmp."""
    global _YOLO, _YOLO_NAMES
    if _YOLO is None:
        # Import after env vars are set
        from ultralytics import YOLO
        from ultralytics.utils import SETTINGS
        
        # Force all Ultralytics directories to /tmp
        SETTINGS['runs_dir'] = '/tmp/runs'
        SETTINGS['datasets_dir'] = '/tmp/datasets'
        SETTINGS['weights_dir'] = '/tmp/weights'
        
        s3 = boto3.client("s3")
        BUCKET = os.environ["BUCKET_NAME"]
        KEY = os.environ.get("MODEL_S3_PATH", "models/model.pt")
        LOCAL_MODEL = "/tmp/model.pt"

        if not Path(LOCAL_MODEL).exists():
            s3.download_file(BUCKET, KEY, LOCAL_MODEL)

        _YOLO = YOLO(LOCAL_MODEL)
        _YOLO_NAMES = _YOLO.names
    return _YOLO

def detect_birds_in_image(path: str, *, conf: float = 0.5) -> dict[str, int]:
    yolo = _load_yolo()
    import cv2 as cv, supervision as sv
    img = cv.imread(path)
    if img is None:
        return {}
    # Run inference with project parameter to force output to /tmp
    results = yolo(img, project='/tmp/runs', name='detect', save=False, verbose=False)
    det = sv.Detections.from_ultralytics(results[0])
    out = {}
    for cid, score in zip(det.class_id, det.confidence, strict=True):
        if score >= conf:
            name = _YOLO_NAMES.get(int(cid), "unknown")
            if name != "unknown":
                out[name] = out.get(name, 0) + 1
    return out

def detect_birds_in_video(path: str, *, conf: float = 0.5, fps: int = 5) -> dict[str, int]:
    yolo = _load_yolo()
    import cv2 as cv, supervision as sv
    cap = cv.VideoCapture(path)
    if not cap.isOpened():
        return {}
    native_fps = cap.get(cv.CAP_PROP_FPS) or 30
    step = max(int(round(native_fps / fps)), 1)
    max_counts = defaultdict(int)
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % step == 0:
            # Run inference with project parameter to force output to /tmp
            results = yolo(frame, project='/tmp/runs', name='detect', save=False, verbose=False)
            det = sv.Detections.from_ultralytics(results[0])
            per = defaultdict(int)
            for cid, score in zip(det.class_id, det.confidence, strict=True):
                if score >= conf:
                    name = _YOLO_NAMES.get(int(cid), "unknown")
                    if name != "unknown":
                        per[name] += 1
            for sp, count in per.items():
                max_counts[sp] = max(max_counts[sp], count)
        idx += 1
    cap.release()
    return dict(max_counts)

def detect_birds_in_audio(path: str, *, conf: float = 0.7) -> dict[str, int]:
    from birdnet import SpeciesPredictions, predict_species_within_audio_file
    from pathlib import Path
    tmp_mono_path = "/tmp/converted_mono.wav"
    mono_path = convert_to_mono(path, tmp_mono_path)

    try:
        raw = predict_species_within_audio_file(Path(mono_path))
        preds = SpeciesPredictions(raw)
    except Exception as e:
        return {}

    result: dict[str,int] = {}
    for _, species_pred in preds.items():
        # species_pred is an OrderedDict: species -> score
        for species, score in species_pred.items():
            if score >= conf:
                name = species.split("_")[-1].strip().lower()
                result[name] = 1
    return result

def detect_birds(file_path: str) -> tuple[str | None, dict[str, int]]:
    """Identify file type and run detection."""
    lower = file_path.lower()
    if lower.endswith((".jpg", ".jpeg", ".png")):
        return "image", detect_birds_in_image(file_path)
    if lower.endswith((".mp4", ".mov", ".mkv")):
        return "video", detect_birds_in_video(file_path)
    if lower.endswith((".wav", ".mp3", ".flac", ".ogg", ".m4a", ".wma")):
        return "audio", detect_birds_in_audio(file_path)
    return None, {}
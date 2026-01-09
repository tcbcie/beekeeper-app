# Varroa Mite Detector - Custom ML Model Backend

## Overview
Build a custom machine learning backend to automatically detect and count varroa mites from monitoring board photographs. This is a standalone training and testing system, independent of any existing AI integrations.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Varroa Mite Detector                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Training   │    │    Model     │    │  Inference   │  │
│  │   Pipeline   │───▶│   Storage    │───▶│     API      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                       │           │
│         ▼                                       ▼           │
│  ┌──────────────┐                       ┌──────────────┐   │
│  │  Annotation  │                       │   Results    │   │
│  │    Tool      │                       │   + Stats    │   │
│  └──────────────┘                       └──────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology | Reason |
|-----------|------------|--------|
| ML Framework | **YOLOv8** (Ultralytics) | Best-in-class object detection, easy training |
| Backend | **Python + FastAPI** | ML ecosystem, async support |
| Image Processing | **OpenCV** | Standard, well-documented |
| Annotation | **Label Studio** or **CVAT** | Free, self-hosted options |
| Model Storage | Local filesystem / S3 | Simple, scalable |
| Database | **SQLite** (dev) / **PostgreSQL** (prod) | Training metadata |

---

## Project Structure

```
varroa-detector/
├── README.md
├── requirements.txt
├── config.yaml                 # Model + training config
│
├── data/
│   ├── raw/                    # Original uploaded images
│   ├── annotated/              # Images with bounding box labels
│   │   ├── images/
│   │   └── labels/             # YOLO format .txt files
│   ├── train/                  # Training split (80%)
│   ├── val/                    # Validation split (20%)
│   └── test/                   # Hold-out test images
│
├── models/
│   ├── yolov8n.pt              # Base model (nano - fast)
│   └── varroa_v1.pt            # Trained model
│
├── src/
│   ├── __init__.py
│   ├── train.py                # Training script
│   ├── predict.py              # Inference module
│   ├── evaluate.py             # Model evaluation + metrics
│   ├── preprocess.py           # Image preprocessing
│   └── utils.py                # Helper functions
│
├── api/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app
│   ├── routes/
│   │   ├── predict.py          # POST /predict - analyze image
│   │   ├── train.py            # POST /train - trigger training
│   │   └── health.py           # GET /health
│   └── schemas.py              # Pydantic models
│
├── scripts/
│   ├── setup_data.py           # Download/organize initial data
│   ├── split_dataset.py        # Train/val/test split
│   └── convert_annotations.py  # Convert label formats
│
├── notebooks/
│   ├── 01_data_exploration.ipynb
│   ├── 02_training.ipynb
│   └── 03_evaluation.ipynb
│
└── tests/
    ├── test_predict.py
    └── test_api.py
```

---

## Phase 1: Data Collection & Annotation

### 1.1 Image Requirements
- **Source**: User-uploaded monitoring board photos
- **Format**: JPG/PNG, any resolution (will be resized)
- **Minimum**: 100-200 annotated images for initial model
- **Ideal**: 500+ images for robust model

### 1.2 Annotation Format (YOLO)
Each image has a corresponding `.txt` file:
```
# class x_center y_center width height (normalized 0-1)
0 0.45 0.32 0.02 0.03
0 0.67 0.81 0.02 0.02
```
- Class `0` = varroa mite
- Coordinates are normalized (0-1) relative to image dimensions

### 1.3 Annotation Tool Setup
**Option A: Label Studio** (Recommended)
```bash
pip install label-studio
label-studio start
```
- Create project with "Object Detection with Bounding Boxes"
- Import images from `data/raw/`
- Export in YOLO format

**Option B: CVAT**
- Self-hosted or cvat.ai
- Export as "YOLO 1.1"

---

## Phase 2: Model Training

### 2.1 Environment Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install ultralytics opencv-python fastapi uvicorn python-multipart
```

### 2.2 Training Script (`src/train.py`)
```python
from ultralytics import YOLO

def train_model(
    data_yaml: str = "data/dataset.yaml",
    epochs: int = 100,
    imgsz: int = 640,
    batch: int = 16,
    model_name: str = "yolov8n.pt"
):
    """Train YOLOv8 model on varroa mite dataset."""
    model = YOLO(model_name)

    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        name="varroa_detector",
        patience=20,  # Early stopping
        save=True,
        plots=True
    )

    return results
```

### 2.3 Dataset Config (`data/dataset.yaml`)
```yaml
path: ./data
train: train/images
val: val/images
test: test/images

nc: 1  # number of classes
names:
  0: varroa_mite
```

### 2.4 Training Command
```bash
python -m src.train --epochs 100 --batch 16
```

---

## Phase 3: Inference API

### 3.1 FastAPI Server (`api/main.py`)
```python
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from ultralytics import YOLO

app = FastAPI(title="Varroa Mite Detector API")

# Load model once at startup
model = YOLO("models/varroa_v1.pt")

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Analyze monitoring board image for varroa mites."""
    # Read image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Run inference
    results = model(img, conf=0.25)

    # Extract detections
    detections = []
    for r in results:
        boxes = r.boxes
        for box in boxes:
            detections.append({
                "confidence": float(box.conf[0]),
                "bbox": box.xyxy[0].tolist()
            })

    return {
        "mite_count": len(detections),
        "detections": detections,
        "confidence": "high" if len(detections) > 0 else "low"
    }

@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None}
```

### 3.2 Run Server
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3.3 Test Endpoint
```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test_board.jpg"
```

Response:
```json
{
  "mite_count": 47,
  "detections": [
    {"confidence": 0.89, "bbox": [120, 340, 135, 355]},
    {"confidence": 0.76, "bbox": [450, 210, 465, 225]}
  ],
  "confidence": "high"
}
```

---

## Phase 4: Evaluation & Testing

### 4.1 Metrics
- **mAP@0.5**: Mean Average Precision at IoU 0.5
- **Precision**: True positives / (True + False positives)
- **Recall**: True positives / (True + False negatives)
- **Count Accuracy**: Predicted count vs actual count correlation

### 4.2 Evaluation Script (`src/evaluate.py`)
```python
from ultralytics import YOLO

def evaluate_model(model_path: str, test_data: str):
    model = YOLO(model_path)
    metrics = model.val(data=test_data)

    return {
        "mAP50": metrics.box.map50,
        "mAP50-95": metrics.box.map,
        "precision": metrics.box.mp,
        "recall": metrics.box.mr
    }
```

### 4.3 Visual Testing
```python
# Generate annotated output images
results = model.predict("test_image.jpg", save=True)
```

---

## Implementation Checklist

### Data Preparation
- [ ] Collect initial dataset (100+ images)
- [ ] Set up annotation tool (Label Studio)
- [ ] Annotate training images with bounding boxes
- [ ] Split dataset (80/20 train/val)
- [ ] Create dataset.yaml config

### Model Training
- [ ] Set up Python environment
- [ ] Install dependencies (ultralytics, opencv, etc.)
- [ ] Run initial training (50 epochs)
- [ ] Evaluate results, adjust hyperparameters
- [ ] Train final model (100+ epochs)
- [ ] Export best weights

### API Development
- [ ] Create FastAPI application
- [ ] Implement /predict endpoint
- [ ] Add image preprocessing
- [ ] Add health check endpoint
- [ ] Write API tests

### Testing & Validation
- [ ] Test on held-out images
- [ ] Compare predicted vs actual mite counts
- [ ] Document accuracy metrics
- [ ] Create test report

---

## Hardware Requirements

**Training**:
- GPU recommended (NVIDIA with CUDA)
- Minimum: 8GB RAM, 4GB VRAM
- Training time: ~30 min on GPU, ~4 hours on CPU

**Inference**:
- CPU sufficient for single image
- ~100-500ms per image on modern CPU
- ~50ms per image on GPU

---

## Future Integration with HiveCraic

Once the model is trained and validated, integration options:

1. **Self-hosted API**: Deploy FastAPI server, call from HiveCraic backend
2. **Serverless**: Package model for AWS Lambda / Google Cloud Functions
3. **Edge**: Export to ONNX for client-side inference (future)

The current VarroaCheckForm already supports image upload - integration would add an "Analyze" button that calls this API.

---

## Resources

- [Ultralytics YOLOv8 Docs](https://docs.ultralytics.com/)
- [Label Studio](https://labelstud.io/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [YOLO Training Guide](https://docs.ultralytics.com/modes/train/)

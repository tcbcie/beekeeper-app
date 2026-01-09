# Varroa Mite Detector

Custom ML model for automatic varroa mite detection from monitoring board photographs.

## Overview

This project provides:
- **Training pipeline** for YOLOv8 object detection model
- **Inference API** for mite detection via REST endpoints
- **Evaluation tools** for model testing and validation

## Quick Start

### 1. Setup Environment

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Prepare Data

1. **Collect Images**: Place monitoring board photos in `data/raw/`

2. **Annotate**: Use Label Studio or CVAT to annotate mites
   ```bash
   # Install Label Studio
   pip install label-studio
   label-studio start
   ```
   - Create project with "Object Detection with Bounding Boxes"
   - Import images from `data/raw/`
   - Draw bounding boxes around each mite
   - Export in YOLO format to `data/annotated/`

3. **Split Dataset**:
   ```bash
   python scripts/split_dataset.py --input data/annotated --output data
   ```

### 3. Train Model

```bash
# Start training (100 epochs)
python -m src.train --epochs 100 --batch 16

# Resume training
python -m src.train --resume runs/train/varroa_detector/weights/last.pt
```

Training outputs are saved to `runs/train/varroa_detector/`:
- `weights/best.pt` - Best model weights
- `weights/last.pt` - Latest checkpoint
- Training metrics and plots

### 4. Evaluate Model

```bash
# Evaluate on validation set
python -m src.evaluate --model runs/train/varroa_detector/weights/best.pt

# Evaluate on test set
python -m src.evaluate --model runs/train/varroa_detector/weights/best.pt --split test
```

### 5. Run API Server

```bash
# Copy best model
cp runs/train/varroa_detector/weights/best.pt models/varroa_best.pt

# Start server
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

API will be available at `http://localhost:8000`

## API Endpoints

### POST /predict

Analyze an image for varroa mites.

```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@board.jpg"
```

Response:
```json
{
  "mite_count": 47,
  "detections": [
    {
      "confidence": 0.89,
      "bbox": {"x1": 120, "y1": 340, "x2": 135, "y2": 355},
      "center": {"x": 127, "y": 347}
    }
  ],
  "confidence": "high",
  "image_size": {"width": 1920, "height": 1080}
}
```

### POST /predict/annotated

Get image with detection boxes drawn.

```bash
curl -X POST "http://localhost:8000/predict/annotated" \
  -F "file=@board.jpg" \
  --output result.jpg
```

### POST /calculate

Calculate infestation rate from mite count.

```bash
curl -X POST "http://localhost:8000/calculate" \
  -H "Content-Type: application/json" \
  -d '{"mite_count": 47, "days_on_board": 7}'
```

Response:
```json
{
  "total_mites": 47,
  "days": 7,
  "daily_drop": 6.71,
  "level": "high",
  "recommended_action": "Treatment recommended"
}
```

### GET /health

Health check endpoint.

```bash
curl http://localhost:8000/health
```

## Project Structure

```
varroa-detector/
├── data/
│   ├── raw/              # Original images
│   ├── annotated/        # Annotated images + labels
│   │   ├── images/
│   │   └── labels/       # YOLO format .txt files
│   ├── train/            # Training split
│   ├── val/              # Validation split
│   └── test/             # Test split
│
├── models/
│   └── varroa_best.pt    # Trained model
│
├── src/
│   ├── train.py          # Training script
│   ├── predict.py        # Prediction module
│   └── evaluate.py       # Evaluation script
│
├── api/
│   ├── main.py           # FastAPI server
│   └── schemas.py        # Pydantic models
│
├── scripts/
│   ├── split_dataset.py  # Dataset splitting
│   └── prepare_data.py   # Data preparation
│
├── config.yaml           # Configuration
├── requirements.txt      # Dependencies
└── README.md
```

## Annotation Guidelines

When annotating mites:

1. **What to annotate**:
   - Varroa mites (reddish-brown, oval, ~1-1.5mm)
   - Each mite should have its own bounding box

2. **What NOT to annotate**:
   - Wax cappings (lighter colored, irregular)
   - Pollen (yellow/orange, round)
   - Bee body parts
   - General debris

3. **Box guidelines**:
   - Box should tightly fit the mite
   - Include the entire mite, not just the center
   - When in doubt, annotate it (false positives are preferable to missed mites)

## Threshold Guidelines

Daily mite drop thresholds (natural mite fall method):

| Mites/Day | Level    | Action                  |
|-----------|----------|-------------------------|
| < 1       | Low      | Continue monitoring     |
| 1-5       | Moderate | Monitor closely         |
| 5-10      | High     | Treatment recommended   |
| > 10      | Critical | Immediate treatment     |

## Hardware Requirements

**Training**:
- GPU recommended (NVIDIA with CUDA support)
- Minimum 8GB RAM, 4GB VRAM
- ~30 minutes on GPU, ~4 hours on CPU (100 epochs)

**Inference**:
- CPU sufficient (~100-500ms per image)
- GPU recommended for batch processing (~50ms per image)

## License

MIT License

"""
Varroa Mite Detector API

FastAPI server for varroa mite detection from monitoring board images.

Usage:
    uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload

Endpoints:
    POST /predict        - Analyze image for mites
    POST /calculate      - Calculate infestation rate
    GET  /health         - Health check
"""

import io
import os
from pathlib import Path
from contextlib import asynccontextmanager

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from api.schemas import (
    PredictionResponse,
    CalculateRequest,
    InfestationRate,
    HealthResponse,
    ErrorResponse
)
from src.predict import VarroaDetector, calculate_infestation_rate
from src import __version__


# Global detector instance
detector: VarroaDetector | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup."""
    global detector

    model_path = os.getenv("MODEL_PATH", "models/varroa_best.pt")

    # Only load if model exists
    if Path(model_path).exists():
        print(f"Loading model from {model_path}...")
        detector = VarroaDetector(model_path)
        detector.load_model()
        print("Model loaded successfully!")
    else:
        print(f"Warning: Model not found at {model_path}")
        print("API will start but predictions will fail until model is available")
        detector = VarroaDetector(model_path)

    yield

    # Cleanup
    detector = None


# Create FastAPI app
app = FastAPI(
    title="Varroa Mite Detector API",
    description="Automatic detection of varroa mites from monitoring board photos",
    version=__version__,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
async def root():
    """Redirect to docs."""
    return {"message": "Varroa Mite Detector API", "docs": "/docs"}


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check API health and model status."""
    model_loaded = detector is not None and detector.model is not None

    return HealthResponse(
        status="ok" if model_loaded else "degraded",
        model_loaded=model_loaded,
        model_path=detector.model_path if detector else None,
        version=__version__
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict(
    file: UploadFile = File(..., description="Image file (JPG, PNG)")
):
    """
    Analyze a monitoring board image for varroa mites.

    Upload an image of a varroa monitoring board (sticky board, screen board).
    The API will detect and count visible mites.

    Returns:
        - mite_count: Number of detected mites
        - detections: List of individual detections with confidence and location
        - confidence: Overall confidence level (none, low, medium, high)
        - image_size: Original image dimensions
    """
    if detector is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload an image (JPG, PNG)"
        )

    try:
        # Read image bytes
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode image")

        # Run prediction
        result = detector.predict(img)

        return PredictionResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/annotated")
async def predict_annotated(
    file: UploadFile = File(..., description="Image file (JPG, PNG)")
):
    """
    Analyze image and return annotated result with bounding boxes.

    Returns the image with detected mites highlighted with bounding boxes.
    """
    if detector is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        # Read image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode image")

        # Run prediction with annotation
        result = detector.predict(img, return_annotated=True)

        # Encode annotated image
        _, buffer = cv2.imencode(".jpg", result["annotated_image"])
        io_buf = io.BytesIO(buffer.tobytes())

        # Return as streaming response with metadata in headers
        return StreamingResponse(
            io_buf,
            media_type="image/jpeg",
            headers={
                "X-Mite-Count": str(result["mite_count"]),
                "X-Confidence": result["confidence"]
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calculate", response_model=InfestationRate)
async def calculate_rate(request: CalculateRequest):
    """
    Calculate daily mite drop rate and infestation level.

    Given a mite count and number of days the board was in the hive,
    calculates the daily mite drop rate and provides a severity assessment.

    Thresholds:
        - < 1 mites/day: Low (continue monitoring)
        - 1-5 mites/day: Moderate (monitor closely)
        - 5-10 mites/day: High (treatment recommended)
        - > 10 mites/day: Critical (immediate treatment)
    """
    result = calculate_infestation_rate(
        mite_count=request.mite_count,
        days_on_board=request.days_on_board
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return InfestationRate(**result)


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            detail=str(exc)
        ).model_dump()
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

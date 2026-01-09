"""Pydantic schemas for API requests and responses."""

from pydantic import BaseModel, Field
from typing import Optional


class BoundingBox(BaseModel):
    """Bounding box coordinates."""
    x1: int
    y1: int
    x2: int
    y2: int


class Point(BaseModel):
    """2D point coordinate."""
    x: int
    y: int


class Detection(BaseModel):
    """Single mite detection."""
    confidence: float = Field(..., ge=0, le=1)
    bbox: BoundingBox
    center: Point


class ImageSize(BaseModel):
    """Image dimensions."""
    width: int
    height: int


class PredictionResponse(BaseModel):
    """Response from /predict endpoint."""
    mite_count: int = Field(..., ge=0)
    detections: list[Detection]
    confidence: str = Field(..., description="Overall confidence: none, low, medium, high")
    image_size: ImageSize


class InfestationRate(BaseModel):
    """Calculated infestation rate."""
    total_mites: int
    days: int
    daily_drop: float
    level: str = Field(..., description="Severity: low, moderate, high, critical")
    recommended_action: str


class CalculateRequest(BaseModel):
    """Request for rate calculation."""
    mite_count: int = Field(..., ge=0)
    days_on_board: int = Field(..., gt=0)


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    model_path: Optional[str] = None
    version: str


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: Optional[str] = None

"""
Prediction module for Varroa Mite Detection.

Usage:
    from src.predict import VarroaDetector

    detector = VarroaDetector("models/varroa_best.pt")
    result = detector.predict("image.jpg")
    print(f"Found {result['mite_count']} mites")
"""

from pathlib import Path
from typing import Union
import cv2
import numpy as np
from ultralytics import YOLO


class VarroaDetector:
    """Varroa mite detector using YOLOv8."""

    def __init__(
        self,
        model_path: str = "models/varroa_best.pt",
        confidence: float = 0.25,
        iou: float = 0.45
    ):
        """
        Initialize detector with trained model.

        Args:
            model_path: Path to trained YOLO weights
            confidence: Detection confidence threshold
            iou: NMS IoU threshold
        """
        self.model_path = model_path
        self.confidence = confidence
        self.iou = iou
        self.model = None

    def load_model(self) -> None:
        """Load the YOLO model."""
        if self.model is None:
            if not Path(self.model_path).exists():
                raise FileNotFoundError(f"Model not found: {self.model_path}")
            self.model = YOLO(self.model_path)

    def predict(
        self,
        image: Union[str, np.ndarray],
        return_annotated: bool = False
    ) -> dict:
        """
        Detect varroa mites in an image.

        Args:
            image: Image path or numpy array (BGR)
            return_annotated: Whether to return annotated image

        Returns:
            Dictionary with:
                - mite_count: Number of detected mites
                - detections: List of detection details
                - confidence: Overall confidence level
                - annotated_image: (optional) Image with boxes drawn
        """
        self.load_model()

        # Load image if path
        if isinstance(image, str):
            img = cv2.imread(image)
            if img is None:
                raise ValueError(f"Could not load image: {image}")
        else:
            img = image

        # Run inference
        results = self.model(
            img,
            conf=self.confidence,
            iou=self.iou,
            verbose=False
        )

        # Extract detections
        detections = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append({
                    "confidence": float(box.conf[0]),
                    "bbox": {
                        "x1": int(x1),
                        "y1": int(y1),
                        "x2": int(x2),
                        "y2": int(y2)
                    },
                    "center": {
                        "x": int((x1 + x2) / 2),
                        "y": int((y1 + y2) / 2)
                    }
                })

        # Determine overall confidence
        mite_count = len(detections)
        if mite_count == 0:
            overall_confidence = "none"
        else:
            avg_conf = sum(d["confidence"] for d in detections) / mite_count
            if avg_conf >= 0.7:
                overall_confidence = "high"
            elif avg_conf >= 0.4:
                overall_confidence = "medium"
            else:
                overall_confidence = "low"

        result = {
            "mite_count": mite_count,
            "detections": detections,
            "confidence": overall_confidence,
            "image_size": {
                "width": img.shape[1],
                "height": img.shape[0]
            }
        }

        # Optionally return annotated image
        if return_annotated:
            annotated = results[0].plot()
            result["annotated_image"] = annotated

        return result

    def predict_batch(
        self,
        images: list[Union[str, np.ndarray]]
    ) -> list[dict]:
        """
        Detect mites in multiple images.

        Args:
            images: List of image paths or arrays

        Returns:
            List of prediction results
        """
        return [self.predict(img) for img in images]


def calculate_infestation_rate(
    mite_count: int,
    days_on_board: int
) -> dict:
    """
    Calculate daily mite drop rate and infection level.

    Args:
        mite_count: Total mites counted
        days_on_board: Number of days monitoring board was in hive

    Returns:
        Dictionary with rate and assessment
    """
    if days_on_board <= 0:
        return {"error": "Days must be positive"}

    daily_drop = mite_count / days_on_board

    # Determine severity based on daily mite drop
    if daily_drop < 1:
        level = "low"
        action = "Continue monitoring"
    elif daily_drop < 5:
        level = "moderate"
        action = "Monitor closely, consider treatment"
    elif daily_drop < 10:
        level = "high"
        action = "Treatment recommended"
    else:
        level = "critical"
        action = "Immediate treatment required"

    return {
        "total_mites": mite_count,
        "days": days_on_board,
        "daily_drop": round(daily_drop, 2),
        "level": level,
        "recommended_action": action
    }


# CLI interface
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Detect varroa mites")
    parser.add_argument("image", type=str, help="Image path")
    parser.add_argument("--model", type=str, default="models/varroa_best.pt",
                        help="Model path")
    parser.add_argument("--conf", type=float, default=0.25,
                        help="Confidence threshold")
    parser.add_argument("--save", action="store_true",
                        help="Save annotated image")

    args = parser.parse_args()

    detector = VarroaDetector(args.model, args.conf)
    result = detector.predict(args.image, return_annotated=args.save)

    print(f"\nResults for: {args.image}")
    print(f"Mite count: {result['mite_count']}")
    print(f"Confidence: {result['confidence']}")

    if args.save and "annotated_image" in result:
        output_path = Path(args.image).stem + "_detected.jpg"
        cv2.imwrite(output_path, result["annotated_image"])
        print(f"Saved: {output_path}")

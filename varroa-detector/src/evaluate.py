"""
Model evaluation script for Varroa Mite Detector.

Usage:
    python -m src.evaluate --model models/varroa_best.pt --data data/dataset.yaml
"""

import argparse
import json
from pathlib import Path
from ultralytics import YOLO


def evaluate_model(
    model_path: str,
    data_yaml: str = "data/dataset.yaml",
    split: str = "val",
    verbose: bool = True
) -> dict:
    """
    Evaluate trained model on validation/test set.

    Args:
        model_path: Path to trained model weights
        data_yaml: Path to dataset configuration
        split: Dataset split to evaluate ("val" or "test")
        verbose: Print detailed results

    Returns:
        Dictionary with evaluation metrics
    """
    if not Path(model_path).exists():
        raise FileNotFoundError(f"Model not found: {model_path}")

    model = YOLO(model_path)

    # Run validation
    results = model.val(
        data=data_yaml,
        split=split,
        verbose=verbose
    )

    # Extract metrics
    metrics = {
        "mAP50": float(results.box.map50),
        "mAP50-95": float(results.box.map),
        "precision": float(results.box.mp),
        "recall": float(results.box.mr),
        "f1": 2 * (results.box.mp * results.box.mr) / (results.box.mp + results.box.mr + 1e-10)
    }

    if verbose:
        print("\n" + "=" * 50)
        print("Evaluation Results")
        print("=" * 50)
        print(f"mAP@0.5:     {metrics['mAP50']:.4f}")
        print(f"mAP@0.5-0.95: {metrics['mAP50-95']:.4f}")
        print(f"Precision:   {metrics['precision']:.4f}")
        print(f"Recall:      {metrics['recall']:.4f}")
        print(f"F1 Score:    {metrics['f1']:.4f}")
        print("=" * 50)

    return metrics


def count_accuracy_test(
    model_path: str,
    test_images: list[dict],
    confidence: float = 0.25
) -> dict:
    """
    Test counting accuracy against ground truth.

    Args:
        model_path: Path to model
        test_images: List of {"image": path, "actual_count": int}
        confidence: Detection confidence threshold

    Returns:
        Counting accuracy metrics
    """
    from src.predict import VarroaDetector

    detector = VarroaDetector(model_path, confidence)

    results = []
    for item in test_images:
        prediction = detector.predict(item["image"])
        results.append({
            "image": item["image"],
            "actual": item["actual_count"],
            "predicted": prediction["mite_count"],
            "error": abs(item["actual_count"] - prediction["mite_count"])
        })

    # Calculate statistics
    total_error = sum(r["error"] for r in results)
    total_actual = sum(r["actual"] for r in results)
    total_predicted = sum(r["predicted"] for r in results)

    mae = total_error / len(results) if results else 0
    accuracy = 1 - (total_error / max(total_actual, 1))

    return {
        "num_images": len(results),
        "total_actual": total_actual,
        "total_predicted": total_predicted,
        "mean_absolute_error": round(mae, 2),
        "count_accuracy": round(accuracy * 100, 2),
        "details": results
    }


def main():
    parser = argparse.ArgumentParser(description="Evaluate Varroa Detector")
    parser.add_argument("--model", type=str, required=True,
                        help="Path to model weights")
    parser.add_argument("--data", type=str, default="data/dataset.yaml",
                        help="Dataset config")
    parser.add_argument("--split", type=str, default="val",
                        choices=["val", "test"],
                        help="Dataset split")
    parser.add_argument("--output", type=str, default=None,
                        help="Save results to JSON file")

    args = parser.parse_args()

    metrics = evaluate_model(
        model_path=args.model,
        data_yaml=args.data,
        split=args.split
    )

    if args.output:
        with open(args.output, "w") as f:
            json.dump(metrics, f, indent=2)
        print(f"\nResults saved to: {args.output}")


if __name__ == "__main__":
    main()

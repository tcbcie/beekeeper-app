"""
Training script for Varroa Mite Detection model.

Usage:
    python -m src.train --epochs 100 --batch 16
    python -m src.train --resume models/varroa_best.pt
"""

import argparse
from pathlib import Path
from ultralytics import YOLO
import yaml


def load_config(config_path: str = "config.yaml") -> dict:
    """Load configuration from YAML file."""
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def train_model(
    data_yaml: str = "data/dataset.yaml",
    epochs: int = 100,
    batch_size: int = 16,
    image_size: int = 640,
    model_name: str = "yolov8n.pt",
    resume: str | None = None,
    device: str = "",
    patience: int = 20,
    workers: int = 4,
    project: str = "runs/train",
    name: str = "varroa_detector"
) -> dict:
    """
    Train YOLOv8 model on varroa mite dataset.

    Args:
        data_yaml: Path to dataset configuration file
        epochs: Number of training epochs
        batch_size: Training batch size
        image_size: Input image size (square)
        model_name: Base model name or path to weights
        resume: Path to checkpoint to resume from
        device: Device to train on ("", "cpu", "0", "0,1")
        patience: Early stopping patience
        workers: Number of data loader workers
        project: Project directory for saving results
        name: Experiment name

    Returns:
        Training results dictionary
    """
    # Load model
    if resume:
        print(f"Resuming training from {resume}")
        model = YOLO(resume)
    else:
        print(f"Starting fresh training with {model_name}")
        model = YOLO(model_name)

    # Train
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=image_size,
        device=device,
        patience=patience,
        workers=workers,
        project=project,
        name=name,
        save=True,
        plots=True,
        verbose=True
    )

    # Print final results
    print("\n" + "=" * 50)
    print("Training Complete!")
    print("=" * 50)
    print(f"Best weights: {project}/{name}/weights/best.pt")

    return results


def main():
    parser = argparse.ArgumentParser(description="Train Varroa Mite Detector")
    parser.add_argument("--data", type=str, default="data/dataset.yaml",
                        help="Path to dataset YAML")
    parser.add_argument("--epochs", type=int, default=100,
                        help="Number of epochs")
    parser.add_argument("--batch", type=int, default=16,
                        help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640,
                        help="Image size")
    parser.add_argument("--model", type=str, default="yolov8n.pt",
                        help="Base model")
    parser.add_argument("--resume", type=str, default=None,
                        help="Resume from checkpoint")
    parser.add_argument("--device", type=str, default="",
                        help="Device (empty=auto, cpu, 0, 0,1)")
    parser.add_argument("--patience", type=int, default=20,
                        help="Early stopping patience")
    parser.add_argument("--workers", type=int, default=4,
                        help="Data loader workers")

    args = parser.parse_args()

    # Check if data exists
    if not Path(args.data).exists():
        print(f"Error: Dataset config not found: {args.data}")
        print("Please create dataset.yaml with train/val paths")
        return

    train_model(
        data_yaml=args.data,
        epochs=args.epochs,
        batch_size=args.batch,
        image_size=args.imgsz,
        model_name=args.model,
        resume=args.resume,
        device=args.device,
        patience=args.patience,
        workers=args.workers
    )


if __name__ == "__main__":
    main()

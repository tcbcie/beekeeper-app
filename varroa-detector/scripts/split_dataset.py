"""
Dataset Split Script

Splits annotated images into train/val/test sets for YOLOv8 training.

Usage:
    python scripts/split_dataset.py --input data/annotated --output data --split 0.8 0.1 0.1
"""

import argparse
import random
import shutil
from pathlib import Path
from typing import Tuple


def split_dataset(
    input_dir: str,
    output_dir: str,
    split_ratio: Tuple[float, float, float] = (0.8, 0.1, 0.1),
    seed: int = 42
) -> dict:
    """
    Split dataset into train/val/test sets.

    Args:
        input_dir: Directory with images/ and labels/ subdirectories
        output_dir: Output directory for split datasets
        split_ratio: (train, val, test) ratios, must sum to 1.0
        seed: Random seed for reproducibility

    Returns:
        Dictionary with split statistics
    """
    random.seed(seed)

    input_path = Path(input_dir)
    output_path = Path(output_dir)

    images_dir = input_path / "images"
    labels_dir = input_path / "labels"

    if not images_dir.exists():
        raise FileNotFoundError(f"Images directory not found: {images_dir}")

    # Get all image files
    image_extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    image_files = [
        f for f in images_dir.iterdir()
        if f.suffix.lower() in image_extensions
    ]

    if not image_files:
        raise ValueError(f"No images found in {images_dir}")

    # Shuffle images
    random.shuffle(image_files)

    # Calculate split indices
    total = len(image_files)
    train_end = int(total * split_ratio[0])
    val_end = train_end + int(total * split_ratio[1])

    splits = {
        "train": image_files[:train_end],
        "val": image_files[train_end:val_end],
        "test": image_files[val_end:]
    }

    stats = {}

    # Copy files to split directories
    for split_name, files in splits.items():
        if not files:
            continue

        split_images = output_path / split_name / "images"
        split_labels = output_path / split_name / "labels"

        split_images.mkdir(parents=True, exist_ok=True)
        split_labels.mkdir(parents=True, exist_ok=True)

        copied_images = 0
        copied_labels = 0

        for img_file in files:
            # Copy image
            dst_img = split_images / img_file.name
            shutil.copy2(img_file, dst_img)
            copied_images += 1

            # Copy corresponding label if exists
            label_file = labels_dir / (img_file.stem + ".txt")
            if label_file.exists():
                dst_label = split_labels / label_file.name
                shutil.copy2(label_file, dst_label)
                copied_labels += 1

        stats[split_name] = {
            "images": copied_images,
            "labels": copied_labels
        }

        print(f"{split_name}: {copied_images} images, {copied_labels} labels")

    return stats


def main():
    parser = argparse.ArgumentParser(description="Split dataset for training")
    parser.add_argument("--input", type=str, default="data/annotated",
                        help="Input directory with images/ and labels/")
    parser.add_argument("--output", type=str, default="data",
                        help="Output directory")
    parser.add_argument("--split", type=float, nargs=3, default=[0.8, 0.1, 0.1],
                        help="Train/val/test split ratios")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed")

    args = parser.parse_args()

    # Validate split ratios
    if abs(sum(args.split) - 1.0) > 0.001:
        print(f"Error: Split ratios must sum to 1.0 (got {sum(args.split)})")
        return

    print(f"Splitting dataset from: {args.input}")
    print(f"Output directory: {args.output}")
    print(f"Split ratio: train={args.split[0]}, val={args.split[1]}, test={args.split[2]}")
    print()

    stats = split_dataset(
        input_dir=args.input,
        output_dir=args.output,
        split_ratio=tuple(args.split),
        seed=args.seed
    )

    print("\nDataset split complete!")
    print(f"Total: {sum(s['images'] for s in stats.values())} images")


if __name__ == "__main__":
    main()

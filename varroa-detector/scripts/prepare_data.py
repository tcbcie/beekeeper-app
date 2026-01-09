"""
Data Preparation Script

Organizes raw images and creates initial directory structure.

Usage:
    python scripts/prepare_data.py --source /path/to/images --dest data/raw
"""

import argparse
import shutil
from pathlib import Path
from PIL import Image


def prepare_images(
    source_dir: str,
    dest_dir: str,
    resize: bool = False,
    max_size: int = 1920
) -> dict:
    """
    Copy and optionally resize images to data directory.

    Args:
        source_dir: Source directory with raw images
        dest_dir: Destination directory
        resize: Whether to resize large images
        max_size: Maximum dimension (width or height)

    Returns:
        Statistics dictionary
    """
    source = Path(source_dir)
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)

    image_extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

    stats = {
        "total": 0,
        "copied": 0,
        "resized": 0,
        "skipped": 0,
        "errors": 0
    }

    for f in source.iterdir():
        if not f.is_file():
            continue
        if f.suffix.lower() not in image_extensions:
            continue

        stats["total"] += 1
        dest_file = dest / f.name

        try:
            if resize:
                with Image.open(f) as img:
                    # Resize if too large
                    if max(img.size) > max_size:
                        ratio = max_size / max(img.size)
                        new_size = (int(img.width * ratio), int(img.height * ratio))
                        img = img.resize(new_size, Image.LANCZOS)
                        # Save as JPG for consistency
                        dest_file = dest / (f.stem + ".jpg")
                        img.save(dest_file, "JPEG", quality=95)
                        stats["resized"] += 1
                    else:
                        shutil.copy2(f, dest_file)
                        stats["copied"] += 1
            else:
                shutil.copy2(f, dest_file)
                stats["copied"] += 1

        except Exception as e:
            print(f"Error processing {f.name}: {e}")
            stats["errors"] += 1

    return stats


def main():
    parser = argparse.ArgumentParser(description="Prepare image data")
    parser.add_argument("--source", type=str, required=True,
                        help="Source directory with images")
    parser.add_argument("--dest", type=str, default="data/raw",
                        help="Destination directory")
    parser.add_argument("--resize", action="store_true",
                        help="Resize large images")
    parser.add_argument("--max-size", type=int, default=1920,
                        help="Maximum dimension for resize")

    args = parser.parse_args()

    print(f"Preparing images from: {args.source}")
    print(f"Destination: {args.dest}")
    if args.resize:
        print(f"Resizing images larger than {args.max_size}px")
    print()

    stats = prepare_images(
        source_dir=args.source,
        dest_dir=args.dest,
        resize=args.resize,
        max_size=args.max_size
    )

    print("\nResults:")
    print(f"  Total found: {stats['total']}")
    print(f"  Copied: {stats['copied']}")
    print(f"  Resized: {stats['resized']}")
    print(f"  Errors: {stats['errors']}")


if __name__ == "__main__":
    main()

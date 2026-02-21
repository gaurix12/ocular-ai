"""
augment.py
----------
Offline augmentation script.
Run ONCE before training to expand each class from ~12 images to ~1000.

Usage:
    python augment.py

Input  : data/labeled/<class>/   (your original images)
Output : data/labeled_augmented/<class>/   (original + augmented images)
"""

import os
import random
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter
import torchvision.transforms as T
import torchvision.transforms.functional as TF
import torch

# ─── Config ────────────────────────────────────────────────────────────────────
INPUT_ROOT  = Path("data/labeled")          # original images (11-12 per class)
OUTPUT_ROOT = Path("data/labeled_augmented")# where augmented dataset will be saved
CLASSES     = ["normal", "neuro-iris", "wilson"]
TARGET_PER_CLASS = 1000                     # target number of images per class
IMG_SIZE    = 224
SEED        = 42
# ───────────────────────────────────────────────────────────────────────────────

random.seed(SEED)
torch.manual_seed(SEED)

# Heavy augmentation pipeline – each call returns a different random transform
def get_augmentation():
    return T.Compose([
        T.RandomHorizontalFlip(p=0.5),
        T.RandomVerticalFlip(p=0.3),
        T.RandomRotation(degrees=30),
        T.RandomAffine(
            degrees=15,
            translate=(0.1, 0.1),
            scale=(0.85, 1.15),
            shear=10
        ),
        T.ColorJitter(
            brightness=0.4,
            contrast=0.4,
            saturation=0.3,
            hue=0.05
        ),
        T.RandomGrayscale(p=0.1),
        T.RandomPerspective(distortion_scale=0.2, p=0.4),
        T.GaussianBlur(kernel_size=3, sigma=(0.1, 1.5)),
        T.Resize((IMG_SIZE, IMG_SIZE)),
        T.ToTensor(),
        T.RandomErasing(p=0.2, scale=(0.02, 0.1)),
        T.ToPILImage(),
    ])


def load_images_from_folder(folder: Path):
    """
    Load images from folder. If folder is missing create it (so script doesn't crash)
    and return empty lists so caller can handle "no originals".
    """
    if not folder.exists():
        print(f"  [INFO] Folder not found: {folder} — creating empty folder.")
        folder.mkdir(parents=True, exist_ok=True)
        return [], []

    images = []
    names = []
    for f in sorted(folder.iterdir()):
        if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}:
            images.append(Image.open(f).convert("RGB"))
            names.append(f.name)
    return images, names


def augment_class(class_name: str):
    src_dir = INPUT_ROOT / class_name
    dst_dir = OUTPUT_ROOT / class_name
    dst_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n[{class_name}] Loading originals from {src_dir} ...")
    originals, names = load_images_from_folder(src_dir)

    if not originals:
        print(f"  WARNING: No images found in {src_dir}. Skipping.")
        return

    n_orig = len(originals)
    print(f"  Found {n_orig} original images.")

    # Step 1: copy originals first
    for img, name in zip(originals, names):
        img.save(dst_dir / f"orig_{name}")
    saved = n_orig

    # Step 2: generate augmented versions until we reach TARGET_PER_CLASS
    aug_count = 0
    print(f"  Generating augmented images up to {TARGET_PER_CLASS} total ...")
    while saved < TARGET_PER_CLASS:
        # pick a random original
        src_img = random.choice(originals)
        transform = get_augmentation()
        try:
            aug_img = transform(src_img)
            aug_img.save(dst_dir / f"aug_{aug_count:05d}.jpg")
            saved += 1
            aug_count += 1
        except Exception as e:
            # occasionally RandomErasing + ToPILImage may mis-match; just retry
            continue

    print(f"  Done. {saved} images saved to {dst_dir}  "
          f"(orig={n_orig}, augmented={aug_count})")


def main():
    print("=" * 60)
    print("Iris Dataset Augmentation")
    print(f"Target: {TARGET_PER_CLASS} images per class")
    print("=" * 60)

    labeled_root = Path("data/labeled")
    # ensure all expected class folders exist (prevent FileNotFoundError)
    for cls in CLASSES:
        d = labeled_root / cls
        if not d.exists():
            print(f"  [INFO] Creating missing class folder: {d}")
            d.mkdir(parents=True, exist_ok=True)

    for cls in CLASSES:
        augment_class(cls)

    print("\n✓ Augmentation complete.")
    print(f"  Augmented dataset saved to: {OUTPUT_ROOT.resolve()}")
    print("\nNext step → run:  python train_supervised.py")


if __name__ == "__main__":
    main()
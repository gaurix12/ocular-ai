"""
split_dataset.py
----------------
Splits the augmented labeled dataset into Train / Val / Test sets
and COPIES (saves) the images into separate folders on disk.

Class names:
    normal | neuro-iris | wilson

Split ratio:
    Train : 80%  →  2400 images  (800 per class)
    Val   : 10%  →   300 images  (100 per class)
    Test  : 10%  →   300 images  (100 per class)

Output structure:
    data/split/
    ├── train/
    │   ├── normal/        (800 images)
    │   ├── neuro-iris/    (800 images)
    │   └── wilson/        (800 images)
    ├── val/
    │   ├── normal/        (100 images)
    │   ├── neuro-iris/    (100 images)
    │   └── wilson/        (100 images)
    └── test/
        ├── normal/        (100 images)
        ├── neuro-iris/    (100 images)
        └── wilson/        (100 images)

Usage:
    python split_dataset.py
"""

import random
import shutil
from pathlib import Path
from collections import defaultdict

# ─── Config ────────────────────────────────────────────────────────────────────
SOURCE_DIR  = Path("data/labeled_augmented")   # output of augment.py
OUTPUT_DIR  = Path("data/split")

CLASS_NAMES = ["normal", "neuro-iris", "wilson"]

TRAIN_RATIO = 0.80
VAL_RATIO   = 0.10
TEST_RATIO  = 0.10   # remainder after train + val

SEED        = 42
VALID_EXTS  = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}
# ───────────────────────────────────────────────────────────────────────────────

assert abs(TRAIN_RATIO + VAL_RATIO + TEST_RATIO - 1.0) < 1e-6, \
    "Train + Val + Test ratios must sum to 1.0"


def create_output_dirs():
    """Create all split/class sub-folders."""
    for split in ["train", "val", "test"]:
        for cls in CLASS_NAMES:
            (OUTPUT_DIR / split / cls).mkdir(parents=True, exist_ok=True)


def load_class_images(class_name: str) -> list:
    """Return a sorted list of image Paths for one class."""
    class_dir = SOURCE_DIR / class_name
    if not class_dir.exists():
        raise FileNotFoundError(
            f"Class folder not found: {class_dir}\n"
            "Run augment.py first to generate the augmented dataset."
        )
    paths = sorted([
        f for f in class_dir.iterdir()
        if f.suffix.lower() in VALID_EXTS
    ])
    if not paths:
        raise RuntimeError(f"No images found in {class_dir}")
    return paths


def split_list(items: list):
    """
    Split shuffled list into (train, val, test).
    Test gets the remainder to avoid losing images due to rounding.
    """
    n       = len(items)
    n_train = int(n * TRAIN_RATIO)
    n_val   = int(n * VAL_RATIO)
    train   = items[:n_train]
    val     = items[n_train : n_train + n_val]
    test    = items[n_train + n_val:]
    return train, val, test


def copy_files(file_paths: list, dest_dir: Path) -> int:
    """Copy each file to dest_dir. Returns number of files copied."""
    for i, src in enumerate(file_paths):
        dst = dest_dir / src.name
        if dst.exists():                          # handle duplicate filenames
            dst = dest_dir / f"{i:06d}_{src.name}"
        shutil.copy2(src, dst)
    return len(file_paths)


def main():
    random.seed(SEED)
    create_output_dirs()

    print("=" * 60)
    print("Iris Dataset  —  Train / Val / Test Split")
    print(f"  Source  : {SOURCE_DIR.resolve()}")
    print(f"  Output  : {OUTPUT_DIR.resolve()}")
    print(f"  Ratios  :  Train {TRAIN_RATIO:.0%}  |  Val {VAL_RATIO:.0%}  |  Test {TEST_RATIO:.0%}")
    print("=" * 60)

    summary = defaultdict(dict)

    for cls in CLASS_NAMES:
        print(f"\n── {cls} ──")

        images = load_class_images(cls)
        random.shuffle(images)
        print(f"  Total images : {len(images)}")

        train_imgs, val_imgs, test_imgs = split_list(images)

        n_train = copy_files(train_imgs, OUTPUT_DIR / "train" / cls)
        n_val   = copy_files(val_imgs,   OUTPUT_DIR / "val"   / cls)
        n_test  = copy_files(test_imgs,  OUTPUT_DIR / "test"  / cls)

        summary[cls]["train"] = n_train
        summary[cls]["val"]   = n_val
        summary[cls]["test"]  = n_test

        print(f"  → Train : {n_train}")
        print(f"  → Val   : {n_val}")
        print(f"  → Test  : {n_test}")

    # ── Summary table ─────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"{'SPLIT SUMMARY':^60}")
    print("=" * 60)
    print(f"{'Class':<20} {'Train':>8} {'Val':>8} {'Test':>8} {'Total':>8}")
    print("-" * 60)

    grand = {"train": 0, "val": 0, "test": 0}
    for cls in CLASS_NAMES:
        tr = summary[cls]["train"]
        vl = summary[cls]["val"]
        te = summary[cls]["test"]
        print(f"{cls:<20} {tr:>8} {vl:>8} {te:>8} {tr+vl+te:>8}")
        grand["train"] += tr
        grand["val"]   += vl
        grand["test"]  += te

    print("-" * 60)
    total = grand["train"] + grand["val"] + grand["test"]
    print(f"{'TOTAL':<20} {grand['train']:>8} {grand['val']:>8} {grand['test']:>8} {total:>8}")
    print("=" * 60)

    print(f"\n✓ Images saved to: {OUTPUT_DIR.resolve()}")
    print("\nGenerated folder structure:")
    for split in ["train", "val", "test"]:
        for cls in CLASS_NAMES:
            n = summary[cls][split]
            print(f"  data/split/{split}/{cls:<12}  ({n} images)")

    print("\n── Next steps ──────────────────────────────────────────")
    print("  Train  → python train_supervised.py")
    print("         (set LABELED_DIR = 'data/split/train' in that file)")
    print("  Eval   → use data/split/val/  for validation during training")
    print("  Test   → use data/split/test/ for final held-out evaluation")


if __name__ == "__main__":
    main()
"""
corrupt_augment_train.py
------------------------
Full pipeline in one file:
  1. Load images from data/labeled_augmented/
  2. Apply realistic corruption techniques (noise, blur, occlusion, etc.)
  3. Save corrupted images to data/corrupted/
  4. Split into train/val/test and save to data/split_corrupted/
  5. Train MobileNetV2 on the corrupted train set
  6. Save model to models/iris_model_corrupted.pth

Purpose:
  Stress-test the model with realistic degradation that mirrors
  real-world iris capture conditions (sensor noise, blur, occlusion).

Usage:
    python corrupt_augment_train.py

DISCLAIMER: For screening purposes only. Not a medical diagnosis.
"""

import os
import random
import shutil
from pathlib import Path
from collections import defaultdict

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler, Subset
from torchvision import models
import torchvision.transforms as T
from tqdm import tqdm

# ─── Global Config ──────────────────────────────────────────────────────────────
SOURCE_DIR      = Path("data/labeled_augmented")   # clean augmented images
CORRUPTED_DIR   = Path("data/corrupted")           # where corrupted images go
SPLIT_DIR       = Path("data/split_corrupted")     # train/val/test split
MODEL_SAVE_DIR  = Path("models")
CHECKPOINT      = MODEL_SAVE_DIR / "iris_model_corrupted.pth"

CLASS_NAMES     = ["normal", "neuro-iris", "wilson"]
VALID_EXTS      = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}
IMG_SIZE        = 224

TRAIN_RATIO     = 0.80
VAL_RATIO       = 0.10
# TEST gets remainder

EPOCHS          = 30
BATCH_SIZE      = 32
LR              = 1e-3
WEIGHT_DECAY    = 1e-4
DEVICE          = "cpu"
SEED            = 42
# ────────────────────────────────────────────────────────────────────────────────


def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


# ════════════════════════════════════════════════════════════════════════════════
# SECTION 1 – CORRUPTION FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════════

def gaussian_noise(img: np.ndarray) -> np.ndarray:
    """Add pixel-level Gaussian noise (σ = 5–15). Mimics sensor noise."""
    sigma = random.uniform(5, 15)
    noise = np.random.normal(0, sigma, img.shape).astype(np.float32)
    noisy = np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    return noisy


def salt_and_pepper_noise(img: np.ndarray, amount: float = None) -> np.ndarray:
    """Randomly flip 1–2% of pixels to black (0) or white (255)."""
    if amount is None:
        amount = random.uniform(0.01, 0.02)
    corrupted = img.copy()
    h, w, c   = corrupted.shape
    n_pixels  = int(h * w * amount)

    # Salt (white)
    ys = np.random.randint(0, h, n_pixels // 2)
    xs = np.random.randint(0, w, n_pixels // 2)
    corrupted[ys, xs] = 255

    # Pepper (black)
    ys = np.random.randint(0, h, n_pixels // 2)
    xs = np.random.randint(0, w, n_pixels // 2)
    corrupted[ys, xs] = 0

    return corrupted


def gaussian_blur(img: Image.Image) -> Image.Image:
    """Apply slight defocus blur (kernel radius 1–3, equiv ~3–7 px)."""
    radius = random.uniform(1.0, 3.0)
    return img.filter(ImageFilter.GaussianBlur(radius=radius))


def brightness_variation(img: Image.Image) -> Image.Image:
    """±15–20% brightness change. Simulates lighting conditions."""
    factor = random.uniform(0.80, 1.20)
    return ImageEnhance.Brightness(img).enhance(factor)


def contrast_variation(img: Image.Image) -> Image.Image:
    """±10–20% contrast change. Mimics device variability."""
    factor = random.uniform(0.80, 1.20)
    return ImageEnhance.Contrast(img).enhance(factor)


def random_rotation(img: Image.Image) -> Image.Image:
    """±5–15° rotation. Simulates slight misalignment during capture."""
    angle = random.uniform(-15, 15)
    return img.rotate(angle, resample=Image.BILINEAR, expand=False)


def partial_occlusion(img: Image.Image) -> Image.Image:
    """
    Overlay a semi-transparent eyelash/eyelid-shaped mask.
    Draws 3–6 curved dark stripes near the top or bottom edge
    to simulate eyelid / eyelash occlusion.
    """
    img = img.copy()
    draw   = ImageDraw.Draw(img, "RGBA")
    w, h   = img.size
    n_lash = random.randint(3, 6)
    edge   = random.choice(["top", "bottom"])

    for _ in range(n_lash):
        x0   = random.randint(0, w)
        thickness = random.randint(2, 6)
        length    = random.randint(w // 4, w // 2)
        alpha     = random.randint(160, 220)   # semi-transparent

        if edge == "top":
            y0 = random.randint(0, h // 5)
            x1 = x0 + length
            y1 = y0 + random.randint(-5, 10)
        else:
            y0 = random.randint(4 * h // 5, h)
            x1 = x0 + length
            y1 = y0 + random.randint(-10, 5)

        draw.line([(x0, y0), (x1, y1)],
                  fill=(20, 15, 10, alpha),
                  width=thickness)

    return img.convert("RGB")


def sector_shift(img: np.ndarray) -> np.ndarray:
    """
    Slight circular shift of the image content by ±1 sector (≈ ±30°).
    Mimics annotation variability or subtle pattern rotation.
    Uses np.roll on a polar-ish approximation (horizontal roll).
    """
    h, w    = img.shape[:2]
    shift_px = random.randint(-w // 12, w // 12)   # ±1/12 of width ≈ ±30°
    return np.roll(img, shift_px, axis=1)


def sector_heatmap_intensity_noise(img: np.ndarray) -> np.ndarray:
    """
    Divide image into a 6-sector radial grid and apply independent
    ±10–15% intensity scaling per sector.
    Simulates heatmap intensity variability across iris sectors.
    """
    result = img.astype(np.float32).copy()
    h, w   = img.shape[:2]
    cy, cx = h // 2, w // 2

    n_sectors = 6
    for s in range(n_sectors):
        angle_start = (360 / n_sectors) * s
        angle_end   = angle_start + (360 / n_sectors)
        factor      = random.uniform(0.85, 1.15)   # ±15%

        # Build a mask for this angular sector
        y_idx, x_idx = np.mgrid[0:h, 0:w]
        angles = np.degrees(np.arctan2(y_idx - cy, x_idx - cx)) % 360
        mask   = (angles >= angle_start) & (angles < angle_end)
        result[mask] *= factor

    return np.clip(result, 0, 255).astype(np.uint8)


# ── Master corruption pipeline ───────────────────────────────────────────────
def corrupt_image(pil_img: Image.Image) -> Image.Image:
    """
    Apply a random subset of corruption techniques to one image.
    Each technique is applied with its own probability so that
    corruptions are diverse and not always identical.
    """
    # Work in both PIL and numpy depending on the technique
    img_pil = pil_img.resize((IMG_SIZE, IMG_SIZE)).convert("RGB")

    # PIL-based corruptions
    if random.random() < 0.6:
        img_pil = gaussian_blur(img_pil)
    if random.random() < 0.6:
        img_pil = brightness_variation(img_pil)
    if random.random() < 0.6:
        img_pil = contrast_variation(img_pil)
    if random.random() < 0.5:
        img_pil = random_rotation(img_pil)
    if random.random() < 0.5:
        img_pil = partial_occlusion(img_pil)

    # Convert to numpy for pixel-level ops
    img_np = np.array(img_pil)

    if random.random() < 0.6:
        img_np = gaussian_noise(img_np)
    if random.random() < 0.5:
        img_np = salt_and_pepper_noise(img_np)
    if random.random() < 0.4:
        img_np = sector_shift(img_np)
    if random.random() < 0.5:
        img_np = sector_heatmap_intensity_noise(img_np)

    return Image.fromarray(img_np)


# ════════════════════════════════════════════════════════════════════════════════
# SECTION 2 – CORRUPT AND SAVE DATASET
# ════════════════════════════════════════════════════════════════════════════════

def corrupt_and_save():
    print("=" * 60)
    print("Step 1 — Corrupting images")
    print(f"  Source    : {SOURCE_DIR}")
    print(f"  Output    : {CORRUPTED_DIR}")
    print("=" * 60)

    total_saved = 0
    for cls in CLASS_NAMES:
        src_cls = SOURCE_DIR / cls
        dst_cls = CORRUPTED_DIR / cls
        dst_cls.mkdir(parents=True, exist_ok=True)

        if not src_cls.exists():
            print(f"  [SKIP] {src_cls} not found")
            continue

        images = sorted([f for f in src_cls.iterdir()
                         if f.suffix.lower() in VALID_EXTS])
        print(f"\n  [{cls}]  {len(images)} images")

        for img_path in tqdm(images, desc=f"  Corrupting {cls}", leave=False):
            try:
                pil_img     = Image.open(img_path).convert("RGB")
                corrupted   = corrupt_image(pil_img)
                save_path   = dst_cls / img_path.name
                corrupted.save(save_path, quality=90)
                total_saved += 1
            except Exception as e:
                print(f"    [skip] {img_path.name}: {e}")

    print(f"\n  ✓ Total corrupted images saved: {total_saved}")


# ════════════════════════════════════════════════════════════════════════════════
# SECTION 3 – TRAIN / VAL / TEST SPLIT
# ════════════════════════════════════════════════════════════════════════════════

def split_dataset():
    print("\n" + "=" * 60)
    print("Step 2 — Splitting into Train / Val / Test")
    print(f"  Source : {CORRUPTED_DIR}")
    print(f"  Output : {SPLIT_DIR}")
    print(f"  Ratios : Train {TRAIN_RATIO:.0%}  Val {VAL_RATIO:.0%}  "
          f"Test {1-TRAIN_RATIO-VAL_RATIO:.0%}")
    print("=" * 60)

    summary = defaultdict(dict)

    for cls in CLASS_NAMES:
        src_cls = CORRUPTED_DIR / cls
        if not src_cls.exists():
            print(f"  [SKIP] {src_cls} not found")
            continue

        images = sorted([f for f in src_cls.iterdir()
                         if f.suffix.lower() in VALID_EXTS])
        random.shuffle(images)

        n        = len(images)
        n_train  = int(n * TRAIN_RATIO)
        n_val    = int(n * VAL_RATIO)

        splits = {
            "train": images[:n_train],
            "val"  : images[n_train : n_train + n_val],
            "test" : images[n_train + n_val:],
        }

        for split, files in splits.items():
            dst = SPLIT_DIR / split / cls
            dst.mkdir(parents=True, exist_ok=True)
            for i, f in enumerate(files):
                dst_f = dst / f.name
                if dst_f.exists():
                    dst_f = dst / f"{i:06d}_{f.name}"
                shutil.copy2(f, dst_f)
            summary[cls][split] = len(files)

    # Print summary table
    print(f"\n{'Class':<20} {'Train':>8} {'Val':>8} {'Test':>8} {'Total':>8}")
    print("-" * 56)
    grand = {"train": 0, "val": 0, "test": 0}
    for cls in CLASS_NAMES:
        if cls not in summary:
            continue
        tr, vl, te = summary[cls]["train"], summary[cls]["val"], summary[cls]["test"]
        print(f"{cls:<20} {tr:>8} {vl:>8} {te:>8} {tr+vl+te:>8}")
        grand["train"] += tr; grand["val"] += vl; grand["test"] += te
    print("-" * 56)
    tot = grand["train"] + grand["val"] + grand["test"]
    print(f"{'TOTAL':<20} {grand['train']:>8} {grand['val']:>8} {grand['test']:>8} {tot:>8}")
    print(f"\n  ✓ Split saved to: {SPLIT_DIR.resolve()}")


# ════════════════════════════════════════════════════════════════════════════════
# SECTION 4 – DATASET & MODEL
# ════════════════════════════════════════════════════════════════════════════════

CLASS_TO_IDX = {name: idx for idx, name in enumerate(CLASS_NAMES)}


def get_train_transforms():
    return T.Compose([
        T.Resize((IMG_SIZE, IMG_SIZE)),
        T.RandomHorizontalFlip(0.5),
        T.ColorJitter(brightness=0.1, contrast=0.1),
        T.ToTensor(),
        T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])


def get_val_transforms():
    return T.Compose([
        T.Resize((IMG_SIZE, IMG_SIZE)),
        T.ToTensor(),
        T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])


class IrisDataset(Dataset):
    def __init__(self, root: str, transform=None):
        self.root      = Path(root)
        self.transform = transform
        self.samples   = []   # (path, label)
        self._load()

    def _load(self):
        for cls, idx in CLASS_TO_IDX.items():
            cls_dir = self.root / cls
            if not cls_dir.exists():
                continue
            for f in sorted(cls_dir.iterdir()):
                if f.suffix.lower() in VALID_EXTS:
                    self.samples.append((f, idx))
        if not self.samples:
            raise RuntimeError(f"No images found in {self.root}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label

    def class_counts(self):
        from collections import Counter
        c = Counter(lbl for _, lbl in self.samples)
        return {CLASS_NAMES[k]: v for k, v in sorted(c.items())}


def build_model():
    weights = models.MobileNet_V2_Weights.DEFAULT
    model   = models.mobilenet_v2(weights=weights)
    in_feat = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(in_feat, 256),
        nn.ReLU(inplace=True),
        nn.Dropout(0.2),
        nn.Linear(256, len(CLASS_NAMES)),
    )
    return model


def make_sampler(dataset: IrisDataset) -> WeightedRandomSampler:
    from collections import Counter
    labels  = [lbl for _, lbl in dataset.samples]
    freq    = Counter(labels)
    cw      = {cls: 1.0 / cnt for cls, cnt in freq.items()}
    weights = [cw[lbl] for lbl in labels]
    return WeightedRandomSampler(weights, num_samples=len(weights), replacement=True)


# ════════════════════════════════════════════════════════════════════════════════
# SECTION 5 – TRAINING
# ════════════════════════════════════════════════════════════════════════════════

def train_one_epoch(model, loader, criterion, optimizer):
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for imgs, labels in tqdm(loader, desc="  train", leave=False):
        imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
        optimizer.zero_grad()
        out  = model(imgs)
        loss = criterion(out, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * imgs.size(0)
        correct    += (out.argmax(1) == labels).sum().item()
        total      += imgs.size(0)
    return total_loss / total, correct / total


def evaluate(model, loader, criterion):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    with torch.no_grad():
        for imgs, labels in tqdm(loader, desc="  val  ", leave=False):
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            out  = model(imgs)
            loss = criterion(out, labels)
            total_loss += loss.item() * imgs.size(0)
            correct    += (out.argmax(1) == labels).sum().item()
            total      += imgs.size(0)
    return total_loss / total, correct / total


def train():
    MODEL_SAVE_DIR.mkdir(exist_ok=True)

    print("\n" + "=" * 60)
    print("Step 3 — Training on Corrupted Dataset")
    print("=" * 60)

    # Datasets
    train_ds = IrisDataset(str(SPLIT_DIR / "train"), transform=get_train_transforms())
    val_ds   = IrisDataset(str(SPLIT_DIR / "val"),   transform=get_val_transforms())

    print(f"\nTrain distribution : {train_ds.class_counts()}")
    print(f"Val distribution   : {val_ds.class_counts()}")
    print(f"Train samples      : {len(train_ds)}")
    print(f"Val samples        : {len(val_ds)}")

    sampler      = make_sampler(train_ds)
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE,
                              sampler=sampler, num_workers=0)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE,
                              shuffle=False, num_workers=0)

    model     = build_model().to(DEVICE)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

    best_val_acc = 0.0
    print(f"\nTraining for {EPOCHS} epochs on {DEVICE} ...\n")

    for epoch in range(1, EPOCHS + 1):
        tr_loss, tr_acc = train_one_epoch(model, train_loader, criterion, optimizer)
        vl_loss, vl_acc = evaluate(model, val_loader, criterion)
        scheduler.step()

        print(f"Epoch [{epoch:02d}/{EPOCHS}]  "
              f"Train Loss: {tr_loss:.4f}  Train Acc: {tr_acc:.4f}  |  "
              f"Val Loss: {vl_loss:.4f}  Val Acc: {vl_acc:.4f}")

        if vl_acc > best_val_acc:
            best_val_acc = vl_acc
            torch.save(model.state_dict(), CHECKPOINT)
            print(f"  ✓ Best model saved → {CHECKPOINT}  (val_acc={vl_acc:.4f})")

    print(f"\n{'='*60}")
    print(f"Training complete.")
    print(f"  Best val accuracy : {best_val_acc:.4f}")
    print(f"  Model saved       : {CHECKPOINT.resolve()}")
    print(f"{'='*60}")
    print("\n⚠  DISCLAIMER: For screening purposes only. Not a medical diagnosis.")


# ════════════════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    set_seed(SEED)

    print("\n" + "█" * 60)
    print("  Iris Disease Screening — Corruption → Split → Train")
    print("█" * 60)

    corrupt_and_save()   # Step 1
    split_dataset()      # Step 2
    train()              # Step 3
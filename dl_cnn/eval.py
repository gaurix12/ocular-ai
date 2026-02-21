"""
evaluate.py
-----------
Final evaluation on the held-out test set.

Works with the model trained by corrupt_augment_train.py.
Fully self-contained — no imports from dataset.py or model.py.

Outputs:
  - Printed accuracy + classification report
  - models/confusion_matrix.png
  - models/roc_curve.png

Usage:
    python evaluate.py

DISCLAIMER: For screening purposes only. Not a medical diagnosis.
"""

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from pathlib import Path
from PIL import Image

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torchvision import models
import torchvision.transforms as T

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
    roc_curve,
    auc,
)
from sklearn.preprocessing import label_binarize

# ─── Config ─────────────────────────────────────────────────────────────────────
TEST_DIR   = Path("data/split_corrupted/test")   # output of corrupt_augment_train.py
CHECKPOINT = Path("models/iris_model_corrupted.pth")
OUTPUT_DIR = Path("models")

CLASS_NAMES  = ["normal", "neuro-iris", "wilson"]
CLASS_TO_IDX = {name: idx for idx, name in enumerate(CLASS_NAMES)}
VALID_EXTS   = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"}
IMG_SIZE     = 224
BATCH_SIZE   = 32
DEVICE       = "cpu"
# ────────────────────────────────────────────────────────────────────────────────


# ════════════════════════════════════════════════════════════════════════════════
# Dataset (self-contained, mirrors corrupt_augment_train.py)
# ════════════════════════════════════════════════════════════════════════════════

def get_val_transforms():
    return T.Compose([
        T.Resize((IMG_SIZE, IMG_SIZE)),
        T.ToTensor(),
        T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])


class IrisTestDataset(Dataset):
    """
    Loads images from:
        root/
            normal/
            neuro-iris/
            wilson/
    """
    def __init__(self, root: str, transform=None):
        self.root      = Path(root)
        self.transform = transform or get_val_transforms()
        self.samples   = []   # (Path, int)
        self._load()

    def _load(self):
        for cls_name, label in CLASS_TO_IDX.items():
            cls_dir = self.root / cls_name
            if not cls_dir.exists():
                print(f"  [WARNING] Folder not found: {cls_dir}")
                continue
            for f in sorted(cls_dir.iterdir()):
                if f.suffix.lower() in VALID_EXTS:
                    self.samples.append((f, label))
        if not self.samples:
            raise RuntimeError(f"No images found under {self.root}.")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        return self.transform(img), label

    def class_counts(self) -> dict:
        from collections import Counter
        cnt = Counter(lbl for _, lbl in self.samples)
        return {CLASS_NAMES[k]: v for k, v in sorted(cnt.items())}


# ════════════════════════════════════════════════════════════════════════════════
# Model (self-contained, mirrors corrupt_augment_train.py)
# ════════════════════════════════════════════════════════════════════════════════

def build_model() -> nn.Module:
    model = models.mobilenet_v2(weights=None)
    in_feat = model.classifier[1].in_features   # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(in_feat, 256),
        nn.ReLU(inplace=True),
        nn.Dropout(0.2),
        nn.Linear(256, len(CLASS_NAMES)),
    )
    return model


def load_model(checkpoint_path: str, device: str = "cpu") -> nn.Module:
    model = build_model()
    state = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(state)
    model.to(device)
    model.eval()
    return model


# ════════════════════════════════════════════════════════════════════════════════
# Inference
# ════════════════════════════════════════════════════════════════════════════════

def run_inference(model, loader):
    all_labels, all_preds, all_probs = [], [], []

    with torch.no_grad():
        for images, labels in loader:
            images  = images.to(DEVICE)
            logits  = model(images)
            probs   = F.softmax(logits, dim=1)

            all_labels.extend(labels.cpu().numpy())
            all_preds.extend(probs.argmax(dim=1).cpu().numpy())
            all_probs.extend(probs.cpu().numpy())

    return (
        np.array(all_labels),
        np.array(all_preds),
        np.array(all_probs),
    )


# ════════════════════════════════════════════════════════════════════════════════
# Plots
# ════════════════════════════════════════════════════════════════════════════════

def plot_confusion_matrix(y_true, y_pred, save_path: Path):
    cm   = confusion_matrix(y_true, y_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=CLASS_NAMES)

    fig, ax = plt.subplots(figsize=(7, 6))
    disp.plot(ax=ax, cmap="Blues", colorbar=True, xticks_rotation=15)
    ax.set_title("Confusion Matrix — Iris Disease Screening", fontsize=13, pad=12)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"  Confusion matrix saved → {save_path}")


def plot_roc_curve(y_true, y_probs, save_path: Path):
    n_classes = len(CLASS_NAMES)
    y_bin     = label_binarize(y_true, classes=list(range(n_classes)))

    colors    = ["#2196F3", "#FF5722", "#4CAF50"]
    fpr_list  = []
    tpr_list  = []

    fig, ax = plt.subplots(figsize=(8, 6))

    for i, (cls_name, color) in enumerate(zip(CLASS_NAMES, colors)):
        fpr, tpr, _ = roc_curve(y_bin[:, i], y_probs[:, i])
        roc_auc     = auc(fpr, tpr)
        fpr_list.append(fpr)
        tpr_list.append(tpr)
        ax.plot(fpr, tpr, color=color, lw=2,
                label=f"{cls_name}  (AUC = {roc_auc:.3f})")

    # Macro-average
    all_fpr  = np.unique(np.concatenate(fpr_list))
    mean_tpr = np.zeros_like(all_fpr)
    for fpr, tpr in zip(fpr_list, tpr_list):
        mean_tpr += np.interp(all_fpr, fpr, tpr)
    mean_tpr /= n_classes
    macro_auc = auc(all_fpr, mean_tpr)

    ax.plot(all_fpr, mean_tpr, "k--", lw=2.5,
            label=f"Macro-average  (AUC = {macro_auc:.3f})")
    ax.plot([0, 1], [0, 1], "r:", lw=1, alpha=0.5, label="Random classifier")

    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.02])
    ax.set_xlabel("False Positive Rate", fontsize=12)
    ax.set_ylabel("True Positive Rate", fontsize=12)
    ax.set_title("ROC Curve — Iris Disease Screening (One-vs-Rest)", fontsize=13)
    ax.legend(loc="lower right", fontsize=10)
    ax.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"  ROC curve saved       → {save_path}")


# ════════════════════════════════════════════════════════════════════════════════
# Main
# ════════════════════════════════════════════════════════════════════════════════

def main():
    OUTPUT_DIR.mkdir(exist_ok=True)

    print("=" * 60)
    print("Iris Disease Screening — Test Set Evaluation")
    print(f"  Checkpoint : {CHECKPOINT}")
    print(f"  Test dir   : {TEST_DIR}")
    print("=" * 60)

    # Validate
    if not CHECKPOINT.exists():
        raise FileNotFoundError(
            f"Checkpoint not found: {CHECKPOINT}\n"
            "Run corrupt_augment_train.py first."
        )
    if not TEST_DIR.exists():
        raise FileNotFoundError(
            f"Test directory not found: {TEST_DIR}\n"
            "Run corrupt_augment_train.py first."
        )

    # Dataset
    test_ds     = IrisTestDataset(str(TEST_DIR))
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE,
                             shuffle=False, num_workers=0)

    print(f"\nTest distribution : {test_ds.class_counts()}")
    print(f"Total test images : {len(test_ds)}")

    # Model
    print(f"\nLoading model ...")
    model = load_model(str(CHECKPOINT), device=DEVICE)
    print("  Model loaded.\n")

    # Inference
    print("Running inference ...")
    y_true, y_pred, y_probs = run_inference(model, test_loader)

    # Accuracy
    n_correct = int((y_true == y_pred).sum())
    accuracy  = n_correct / len(y_true) * 100

    print(f"\n{'─'*60}")
    print(f"  Test Accuracy : {accuracy:.2f}%  ({n_correct} / {len(y_true)} correct)")
    print(f"{'─'*60}\n")

    # Classification report
    print("Classification Report:")
    print(classification_report(y_true, y_pred,
                                target_names=CLASS_NAMES, digits=4))

    # Plots
    print("Saving plots ...")
    plot_confusion_matrix(y_true, y_pred,
                          save_path=OUTPUT_DIR / "confusion_matrix.png")
    plot_roc_curve(y_true, y_probs,
                   save_path=OUTPUT_DIR / "roc_curve.png")

    print(f"\n{'='*60}")
    print("Evaluation complete.")
    print(f"  Test Accuracy    : {accuracy:.2f}%")
    print(f"  Confusion matrix : {OUTPUT_DIR}/confusion_matrix.png")
    print(f"  ROC curve        : {OUTPUT_DIR}/roc_curve.png")
    print(f"{'='*60}")
    print("\n⚠  DISCLAIMER: For screening purposes only. Not a medical diagnosis.")


if __name__ == "__main__":
    main()
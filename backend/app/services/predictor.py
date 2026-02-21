"""
predictor.py — Real MobileNetV2 iris disease prediction service.

Replaces the mock predictor with actual inference using the trained model
at dl_cnn/models/iris_model_corrupted.pth.

Classes: normal | neuro-iris | wilson

This module is intentionally isolated from route logic.
The route calls generate_real_prediction(image_path) and receives the
same dict shape as the old mock — no route changes needed beyond the
function name and the image_path argument.
"""

import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models
import torchvision.transforms as T
from PIL import Image
from flask import current_app


# ─── Class definitions (must match training exactly) ────────────────────────────
CLASS_NAMES = ["normal", "neuro-iris", "wilson"]

# Export DISEASES for tests and other modules
DISEASES = CLASS_NAMES

RECOMMENDATIONS = {
    "normal": (
        "No significant iris abnormalities detected. "
        "Maintain regular annual eye examinations. Protect eyes from UV radiation "
        "and maintain a healthy diet rich in omega-3 fatty acids and antioxidants."
    ),
    "neuro-iris": (
        "Lisch nodules detected — a potential indicator of Neurofibromatosis Type 1 (NF-1). "
        "Immediate referral to a neurologist and ophthalmologist is strongly recommended. "
        "Genetic counselling and full neurological evaluation should be considered. "
        "Regular follow-up every 6–12 months is advised."
    ),
    "wilson": (
        "Kayser–Fleischer rings detected — a potential indicator of Wilson disease. "
        "Urgent referral to a hepatologist or neurologist is recommended. "
        "Serum ceruloplasmin and 24-hour urinary copper tests should be arranged immediately. "
        "Early treatment with copper-chelating agents can prevent serious organ damage."
    ),
}
# ───────────────────────────────────────────────────────────────────────────────


# ─── Model singleton (loaded once at first request) ─────────────────────────────
_model = None


def _build_model() -> nn.Module:
    """
    Reconstruct MobileNetV2 with the exact same classifier head used during
    training in corrupt_augment_train.py. Architecture must match the checkpoint.
    """
    model = models.mobilenet_v2(weights=None)
    in_features = model.classifier[1].in_features   # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(in_features, 256),
        nn.ReLU(inplace=True),
        nn.Dropout(0.2),
        nn.Linear(256, len(CLASS_NAMES)),
    )
    return model


def _get_model() -> nn.Module:
    """
    Load and cache the model on first call.
    Reads MODEL_PATH from Flask app config (set in config.py).
    Subsequent calls return the cached instance — no repeated disk I/O.
    """
    global _model
    if _model is None:
        model_path = current_app.config["MODEL_PATH"]

        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model checkpoint not found at: {model_path}\n"
                "Run corrupt_augment_train.py to generate iris_model_corrupted.pth."
            )

        model = _build_model()
        state_dict = torch.load(model_path, map_location="cpu")
        model.load_state_dict(state_dict)
        model.eval()
        _model = model

    return _model


# ─── Preprocessing (identical to get_val_transforms() in training) ──────────────
def _get_transforms() -> T.Compose:
    return T.Compose([
        T.Resize((224, 224)),
        T.ToTensor(),
        T.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])


# ─── Risk level helper ──────────────────────────────────────────────────────────
def _determine_risk_level(top_class: str, confidence: float) -> str:
    """
    Risk level combines class severity with model confidence.
      - wilson / neuro-iris are inherently higher risk
      - confidence thresholds further modulate the level
    """
    if top_class == "normal":
        return "Low"

    # Serious disease detected
    if confidence >= 0.75:
        return "High"
    elif confidence >= 0.50:
        return "Medium"
    return "Low"


# ─── Public entry point ─────────────────────────────────────────────────────────
def generate_mock_prediction(image_path: str = None):
    """Mock prediction for testing without model."""
    import random
    
    # Generate random probabilities that sum to 1.0
    scores = [random.random() for _ in CLASS_NAMES]
    total = sum(scores)
    all_scores = {
        cls: round(score / total, 4)
        for cls, score in zip(CLASS_NAMES, scores)
    }
    
    # Get top disease and confidence
    top_disease = max(all_scores, key=all_scores.get)
    confidence = all_scores[top_disease]
    
    # Determine risk level
    risk_level = _determine_risk_level(top_disease, confidence)
    
    # Get recommendation
    recommendation = RECOMMENDATIONS[top_disease]
    
    return {
        "top_disease":    top_disease,
        "confidence":     confidence,
        "risk_level":     risk_level,
        "all_scores":     all_scores,
        "recommendation": recommendation,
    }

def generate_real_prediction(image_path: str) -> dict:
    """
    Run MobileNetV2 inference on a saved iris image.

    Args:
        image_path: absolute or relative path to the uploaded image file
                    (saved by the route before calling this function).

    Returns a dict with:
        - top_disease  (str)   : predicted class name
        - confidence   (float) : softmax probability of top class
        - risk_level   (str)   : 'High' | 'Medium' | 'Low'
        - all_scores   (dict)  : {class_name: probability} for all 3 classes
        - recommendation (str) : clinical guidance string
    """
    # 1. Load and preprocess image
    image    = Image.open(image_path).convert("RGB")
    tensor   = _get_transforms()(image).unsqueeze(0)   # shape: (1, 3, 224, 224)

    # 2. Inference
    model    = _get_model()
    with torch.no_grad():
        logits = model(tensor)                          # shape: (1, 3)
        probs  = F.softmax(logits, dim=1).squeeze(0)   # shape: (3,)

    # 3. Build results
    all_scores  = {
        cls: round(probs[i].item(), 4)
        for i, cls in enumerate(CLASS_NAMES)
    }
    top_disease = max(all_scores, key=all_scores.get)
    confidence  = all_scores[top_disease]
    risk_level  = _determine_risk_level(top_disease, confidence)
    recommendation = RECOMMENDATIONS[top_disease]

    return {
        "top_disease":    top_disease,
        "confidence":     confidence,
        "risk_level":     risk_level,
        "all_scores":     all_scores,
        "recommendation": recommendation,
    }
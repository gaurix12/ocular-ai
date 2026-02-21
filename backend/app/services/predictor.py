"""
predictor.py — Mock prediction service.

This module is intentionally isolated from route logic.
Replace generate_mock_prediction() internals with real ML model
inference without touching any route or controller code.
"""
import random

DISEASES = [
    "Diabetic Retinopathy",
    "Glaucoma",
    "Uveitis",
    "Arcus Senilis",
    "Anemia Indicators",
    "Normal",
]

RECOMMENDATIONS = {
    "Diabetic Retinopathy": (
        "Immediate ophthalmological consultation is strongly recommended. "
        "Monitor blood glucose levels closely and maintain HbA1c below 7%. "
        "Regular fundus examinations every 6 months are advised."
    ),
    "Glaucoma": (
        "Consult an ophthalmologist for intraocular pressure measurement and "
        "visual field testing. Treatment may include eye drops, laser therapy, "
        "or surgery depending on severity. Avoid activities that increase IOP."
    ),
    "Uveitis": (
        "Seek immediate medical attention. Anti-inflammatory treatment is "
        "often required. Underlying systemic conditions should be investigated. "
        "Follow-up appointments every 4 weeks during active inflammation."
    ),
    "Arcus Senilis": (
        "While often benign in older adults, in patients under 45 this may indicate "
        "hyperlipidemia. A fasting lipid panel and cardiovascular risk assessment "
        "are recommended. Dietary modifications may be advised."
    ),
    "Anemia Indicators": (
        "A complete blood count (CBC) and iron studies are recommended urgently. "
        "Nutritional assessment and dietary counseling may be beneficial. "
        "Oral iron supplementation may be initiated pending lab results."
    ),
    "Normal": (
        "No significant ocular abnormalities detected in this analysis. "
        "Maintain regular annual eye examinations. Protect eyes from UV radiation "
        "and maintain a healthy diet rich in omega-3 fatty acids and antioxidants."
    ),
}


def _generate_random_probabilities(n: int) -> list[float]:
    """Generate n random values that sum to 1.0."""
    raw = [random.random() for _ in range(n)]
    total = sum(raw)
    return [round(v / total, 4) for v in raw]


def _determine_risk_level(confidence: float) -> str:
    if confidence > 0.75:
        return "High"
    elif confidence >= 0.50:
        return "Medium"
    return "Low"


def generate_mock_prediction() -> dict:
    """
    Entry point for the prediction service.

    Returns a dict with:
        - top_disease (str)
        - confidence (float)
        - risk_level (str): 'High' | 'Medium' | 'Low'
        - all_scores (dict): {disease: probability}
        - recommendation (str)
    """
    probabilities = _generate_random_probabilities(len(DISEASES))
    scores = dict(zip(DISEASES, probabilities))

    top_disease = max(scores, key=scores.get)
    confidence = scores[top_disease]
    risk_level = _determine_risk_level(confidence)
    recommendation = RECOMMENDATIONS[top_disease]

    return {
        "top_disease": top_disease,
        "confidence": confidence,
        "risk_level": risk_level,
        "all_scores": scores,
        "recommendation": recommendation,
    }

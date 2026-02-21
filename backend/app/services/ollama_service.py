"""
ollama_service.py — Ollama LLM integration for report generation.

Uses local Ollama (e.g. meditron-3:8b) to generate clinical insights
and enhanced recommendations for iris disease detection reports.
"""

import logging
import requests
from flask import current_app

logger = logging.getLogger(__name__)


def _get_ollama_config():
    """Read Ollama config from app."""
    return {
        "base_url": current_app.config.get("OLLAMA_BASE_URL", "http://localhost:11434"),
        "model": current_app.config.get("OLLAMA_MODEL", "meditron:7b"),
        "timeout": current_app.config.get("OLLAMA_TIMEOUT", 120),
    }


def generate_report_insights(
    top_disease: str,
    confidence: float,
    risk_level: str,
    all_scores: dict,
    base_recommendation: str,
) -> str | None:
    """
    Call Ollama LLM to generate enhanced clinical insights for the report.

    Args:
        top_disease: Primary predicted condition
        confidence: Model confidence (0–1)
        risk_level: Low / Medium / High
        all_scores: Dict of {disease: probability}
        base_recommendation: Existing recommendation from predictor

    Returns:
        LLM-generated text, or None if Ollama is unavailable
    """
    config = _get_ollama_config()
    url = f"{config['base_url'].rstrip('/')}/api/generate"

    scores_str = ", ".join(
        f"{d}: {p*100:.1f}%" for d, p in sorted(all_scores.items(), key=lambda x: -x[1])
    )

    system_prompt = (
        "You are a medical assistant helping ophthalmologists interpret iris imaging results. "
        "Provide concise, clinically relevant insights. Do not diagnose—only summarize findings "
        "and suggest next steps. Keep responses under 200 words. Use plain language."
    )

    user_prompt = f"""Based on this iris disease detection result, write a brief clinical summary and insights for the patient report:

**Findings:**
- Primary condition: {top_disease}
- Confidence: {confidence*100:.1f}%
- Risk level: {risk_level}
- Probability distribution: {scores_str}

**Base recommendation:** {base_recommendation}

Write 2–4 short paragraphs covering: (1) interpretation of the findings, (2) clinical significance, (3) suggested follow-up actions. Be concise and professional."""

    payload = {
        "model": config["model"],
        "prompt": user_prompt,
        "system": system_prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 400,
        },
    }

    try:
        resp = requests.post(
            url,
            json=payload,
            timeout=config["timeout"],
        )
        resp.raise_for_status()
        data = resp.json()
        text = (data.get("response") or "").strip()
        return text if text else None
    except requests.exceptions.ConnectionError:
        logger.warning("Ollama not reachable at %s. Report will use base recommendation only.", url)
        return None
    except requests.exceptions.Timeout:
        logger.warning("Ollama request timed out. Report will use base recommendation only.")
        return None
    except Exception as e:
        logger.warning("Ollama error: %s. Report will use base recommendation only.", e)
        return None

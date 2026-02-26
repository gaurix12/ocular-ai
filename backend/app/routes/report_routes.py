import os
from datetime import datetime

from flask import Blueprint, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    HRFlowable, Table, TableStyle,
)

from app.extensions import db
from app.models.prediction import Prediction
from app.models.report import Report
from app.models.user import User
from app.services.ollama_service import generate_report_insights
from app.utils.response import error_response

report_bp = Blueprint("report", __name__, url_prefix="")

RISK_COLORS = {
    "High":   colors.HexColor("#DC2626"),
    "Medium": colors.HexColor("#D97706"),
    "Low":    colors.HexColor("#16A34A"),
}


def _build_pdf(
    prediction: Prediction,
    user: User,
    pdf_path: str,
    llm_insights: str | None = None,
) -> None:
    """Build the PDF report and write it to pdf_path."""

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Title"],
        fontSize=22,
        textColor=colors.HexColor("#1E3A5F"),
        spaceAfter=6,
    )
    heading_style = ParagraphStyle(
        "HeadingStyle",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#1E3A5F"),
        spaceBefore=12,
        spaceAfter=4,
    )
    normal_style = ParagraphStyle(
        "NormalStyle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.grey,
        leading=12,
    )

    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    # NOTE: No emoji — ReportLab default fonts (Helvetica) do not support
    # Unicode emoji and will raise UnicodeEncodeError / ValueError.
    story.append(Paragraph("Iris Disease Detection Report", title_style))
    story.append(Paragraph("AI-Powered Ophthalmological Analysis", normal_style))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1E3A5F")))
    story.append(Spacer(1, 0.4 * cm))

    # ── Patient Info ──────────────────────────────────────────────────────────
    story.append(Paragraph("Patient Information", heading_style))

    # Support both full_name and username attributes gracefully
    display_name = (
        getattr(user, "full_name", None)
        or getattr(user, "username", None)
        or user.email
    )
    patient_data = [
        ["Patient Name:", str(display_name)],
        ["Email:",        str(user.email)],
        ["Report Date:",  datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")],
        ["Report ID:",    str(prediction.id)],
    ]
    patient_table = Table(patient_data, colWidths=[4 * cm, 13 * cm])
    patient_table.setStyle(TableStyle([
        ("FONTSIZE",      (0, 0), (-1, -1), 10),
        ("FONTNAME",      (0, 0), (0, -1),  "Helvetica-Bold"),
        ("TEXTCOLOR",     (0, 0), (0, -1),  colors.HexColor("#374151")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))

    # ── Diagnosis Summary ─────────────────────────────────────────────────────
    story.append(Paragraph("Diagnosis Summary", heading_style))
    risk_color = RISK_COLORS.get(str(prediction.risk_level), colors.black)
    diagnosis_data = [
        ["Primary Condition:", str(prediction.top_disease)],
        ["Confidence Score:",  f"{float(prediction.confidence) * 100:.1f}%"],
        ["Risk Level:",        str(prediction.risk_level)],
    ]
    diag_table = Table(diagnosis_data, colWidths=[4 * cm, 13 * cm])
    diag_table.setStyle(TableStyle([
        ("FONTSIZE",      (0, 0), (-1, -1), 11),
        ("FONTNAME",      (0, 0), (0, -1),  "Helvetica-Bold"),
        ("FONTNAME",      (1, 0), (1, -1),  "Helvetica"),
        ("TEXTCOLOR",     (1, 2), (1, 2),   risk_color),
        ("FONTNAME",      (1, 2), (1, 2),   "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
    ]))
    story.append(diag_table)
    story.append(Spacer(1, 0.3 * cm))

    # ── Probability Distribution ──────────────────────────────────────────────
    story.append(Paragraph("Probability Distribution", heading_style))
    score_data = [["Condition", "Probability"]]
    for score in sorted(prediction.scores, key=lambda s: s.probability, reverse=True):
        score_data.append([
            str(score.disease_name),
            f"{float(score.probability) * 100:.1f}%",
        ])

    score_table = Table(score_data, colWidths=[10 * cm, 7 * cm])
    score_table.setStyle(TableStyle([
        ("BACKGROUND",     (0, 0), (-1, 0),  colors.HexColor("#1E3A5F")),
        ("TEXTCOLOR",      (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",       (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",       (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F9FAFB"), colors.white]),
        ("GRID",           (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 6),
        ("TOPPADDING",     (0, 0), (-1, -1), 6),
        ("ALIGN",          (1, 0), (1, -1),  "CENTER"),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 0.4 * cm))

    # ── Medical Recommendation ────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
    story.append(Paragraph("Medical Recommendation", heading_style))
    story.append(Paragraph(
        str(prediction.recommendation or "No recommendation available."),
        normal_style,
    ))
    story.append(Spacer(1, 0.4 * cm))

    # ── AI Clinical Insights (Ollama — skipped gracefully if unavailable) ─────
    if llm_insights:
        import html
        story.append(Paragraph("AI Clinical Insights", heading_style))
        # Sanitize: strip characters outside latin-1 range that crash ReportLab
        safe_text = llm_insights.encode("latin-1", errors="replace").decode("latin-1")
        # Escape XML to prevent ReportLab crashes on < or &, and preserve newlines
        safe_text = html.escape(safe_text).replace("\n", "<br/>")
        story.append(Paragraph(safe_text, normal_style))
        story.append(Spacer(1, 0.4 * cm))

    # ── Disclaimer ────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        "DISCLAIMER: This report is generated by an AI-assisted system for "
        "informational purposes only. It does NOT constitute a medical diagnosis. "
        "Always consult a qualified ophthalmologist or healthcare professional "
        "before making any medical decisions. Predictions are based on algorithmic "
        "analysis and may not be 100% accurate.",
        disclaimer_style,
    ))

    doc.build(story)


@report_bp.route("/report/<string:prediction_id>", methods=["GET"])
@jwt_required()
def get_report(prediction_id):
    user_id = get_jwt_identity()

    # ── Fetch prediction ──────────────────────────────────────────────────────
    prediction = db.session.get(Prediction, prediction_id)
    if not prediction:
        return error_response("Prediction not found.", 404)

    if prediction.user_id != user_id:
        return error_response("Access denied.", 403)

    # ── Fetch user ────────────────────────────────────────────────────────────
    user = db.session.get(User, user_id)
    if not user:
        return error_response("User not found.", 404)

    # ── Return cached PDF if it still exists on disk ──────────────────────────
    existing_report = Report.query.filter_by(prediction_id=prediction_id).first()
    if existing_report and os.path.exists(existing_report.pdf_path):
        return send_file(
            existing_report.pdf_path,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"iris_report_{prediction_id[:8]}.pdf",
        )

    # ── Prepare output path ───────────────────────────────────────────────────
    reports_folder = current_app.config.get("REPORTS_FOLDER", "reports")
    # Ensure reports_folder is absolute so os.makedirs creates it correctly and send_file finds it
    if not os.path.isabs(reports_folder):
        reports_folder = os.path.abspath(os.path.join(current_app.root_path, '..', reports_folder))
        
    os.makedirs(reports_folder, exist_ok=True)
    pdf_path = os.path.join(reports_folder, f"report_{prediction_id}.pdf")

    # ── Generate LLM insights (safe — returns None if Ollama is down) ─────────
    all_scores = {s.disease_name: s.probability for s in prediction.scores}
    llm_insights = generate_report_insights(
        top_disease=str(prediction.top_disease),
        confidence=float(prediction.confidence),
        risk_level=str(prediction.risk_level),
        all_scores=all_scores,
        base_recommendation=str(prediction.recommendation or ""),
    )

    # ── Build PDF ─────────────────────────────────────────────────────────────
    try:
        _build_pdf(prediction, user, pdf_path, llm_insights=llm_insights)
    except Exception as e:
        current_app.logger.exception("PDF generation failed: %s", e)
        return error_response(f"Failed to generate PDF report: {str(e)}", 500)

    # ── Persist report record ─────────────────────────────────────────────────
    if existing_report:
        existing_report.pdf_path = pdf_path
        existing_report.generated_at = datetime.utcnow()
    else:
        report = Report(prediction_id=prediction_id, pdf_path=pdf_path)
        db.session.add(report)
    db.session.commit()

    return send_file(
        pdf_path,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"iris_report_{prediction_id[:8]}.pdf",
    )
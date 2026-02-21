import os
from datetime import datetime
from flask import Blueprint, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from app.extensions import db
from app.models.prediction import Prediction
from app.models.report import Report
from app.models.user import User
from app.services.ollama_service import generate_report_insights
from app.utils.response import error_response

report_bp = Blueprint("report", __name__, url_prefix="")

RISK_COLORS = {
    "High": colors.HexColor("#DC2626"),
    "Medium": colors.HexColor("#D97706"),
    "Low": colors.HexColor("#16A34A"),
}


def _build_pdf(
    prediction: Prediction,
    user: User,
    pdf_path: str,
    llm_insights: str | None = None,
) -> None:
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

    # Header
    story.append(Paragraph("🔬 Iris Disease Detection Report", title_style))
    story.append(Paragraph("AI-Powered Ophthalmological Analysis", normal_style))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1E3A5F")))
    story.append(Spacer(1, 0.4 * cm))

    # Patient Info
    story.append(Paragraph("Patient Information", heading_style))
    patient_data = [
        ["Patient Name:", user.full_name],
        ["Email:", user.email],
        ["Report Date:", datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")],
        ["Report ID:", prediction.id],
    ]
    patient_table = Table(patient_data, colWidths=[4 * cm, 13 * cm])
    patient_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#374151")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(patient_table)

    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))

    # Diagnosis
    story.append(Paragraph("Diagnosis Summary", heading_style))
    risk_color = RISK_COLORS.get(prediction.risk_level, colors.black)
    diagnosis_data = [
        ["Primary Condition:", prediction.top_disease],
        ["Confidence Score:", f"{prediction.confidence * 100:.1f}%"],
        ["Risk Level:", prediction.risk_level],
    ]
    diag_table = Table(diagnosis_data, colWidths=[4 * cm, 13 * cm])
    diag_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("TEXTCOLOR", (1, 2), (1, 2), risk_color),
        ("FONTNAME", (1, 2), (1, 2), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(diag_table)
    story.append(Spacer(1, 0.3 * cm))

    # All Scores
    story.append(Paragraph("Probability Distribution", heading_style))
    score_data = [["Condition", "Probability"]]
    for score in sorted(prediction.scores, key=lambda s: s.probability, reverse=True):
        score_data.append([score.disease_name, f"{score.probability * 100:.1f}%"])

    score_table = Table(score_data, colWidths=[10 * cm, 7 * cm])
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A5F")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F9FAFB"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 0.4 * cm))

    # Recommendation
    story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
    story.append(Paragraph("Medical Recommendation", heading_style))
    story.append(Paragraph(prediction.recommendation or "No recommendation available.", normal_style))
    story.append(Spacer(1, 0.4 * cm))

    # LLM-generated clinical insights (from Ollama meditron:7b)
    if llm_insights:
        story.append(Paragraph("AI Clinical Insights", heading_style))
        story.append(Paragraph(llm_insights, normal_style))
        story.append(Spacer(1, 0.4 * cm))

    # Disclaimer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
    story.append(Spacer(1, 0.3 * cm))
    story.append(
        Paragraph(
            "⚠ DISCLAIMER: This report is generated by an AI-assisted system for informational purposes only. "
            "It does NOT constitute a medical diagnosis. Always consult a qualified ophthalmologist or "
            "healthcare professional before making any medical decisions. The predictions are based on "
            "algorithmic analysis and may not be 100% accurate.",
            disclaimer_style,
        )
    )

    doc.build(story)


@report_bp.route("/report/<string:prediction_id>", methods=["GET"])
@jwt_required()
def get_report(prediction_id):
    user_id = get_jwt_identity()

    prediction = db.session.get(Prediction, prediction_id)
    if not prediction:
        return error_response("Prediction not found.", 404)

    if prediction.user_id != user_id:
        return error_response("Access denied.", 403)

    user = db.session.get(User, user_id)
    if not user:
        return error_response("User not found.", 404)

    existing_report = Report.query.filter_by(prediction_id=prediction_id).first()
    if existing_report and os.path.exists(existing_report.pdf_path):
        return send_file(
            existing_report.pdf_path,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"iris_report_{prediction_id[:8]}.pdf",
        )

    reports_folder = current_app.config["REPORTS_FOLDER"]
    os.makedirs(reports_folder, exist_ok=True)
    pdf_filename = f"report_{prediction_id}.pdf"
    pdf_path = os.path.join(reports_folder, pdf_filename)

    # Generate LLM insights via Ollama (meditron:7b) if available
    all_scores = {s.disease_name: s.probability for s in prediction.scores}
    llm_insights = generate_report_insights(
        top_disease=str(prediction.top_disease),
        confidence=prediction.confidence,
        risk_level=str(prediction.risk_level),
        all_scores=all_scores,
        base_recommendation=prediction.recommendation or "",
    )

    _build_pdf(prediction, user, pdf_path, llm_insights=llm_insights)

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

import os
import uuid
from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.prediction import Prediction, PredictionScore
from app.services.predictor import generate_real_prediction
from app.utils.response import success_response, error_response
from app.utils.validators import validate_image_file

prediction_bp = Blueprint("prediction", __name__, url_prefix="")


@prediction_bp.route("/predict", methods=["POST"])
@jwt_required()
def predict():
    user_id = get_jwt_identity()

    if "image" not in request.files:
        return error_response("No image file provided. Use field name 'image'.", 400)

    file = request.files["image"]
    is_valid, msg = validate_image_file(file)
    if not is_valid:
        return error_response(msg, 400)

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    ext = file.filename.rsplit(".", 1)[-1].lower()
    filename = f"{uuid.uuid4()}.{ext}"
    save_path = os.path.join(upload_folder, filename)
    file.save(save_path)

    try:
        result = generate_real_prediction(save_path)
    except FileNotFoundError:
        return error_response(
            "Prediction model not available. Please contact administrator.",
            503,
        )
    prediction = Prediction(
        user_id=user_id,
        image_path=save_path,
        top_disease=result["top_disease"],
        confidence=result["confidence"],
        risk_level=result["risk_level"],
        recommendation=result["recommendation"],
    )
    db.session.add(prediction)
    db.session.flush()

    for disease, prob in result["all_scores"].items():
        score = PredictionScore(
            prediction_id=prediction.id,
            disease_name=disease,
            probability=prob,
        )
        db.session.add(score)

    db.session.commit()

    return success_response(
        data={
            "prediction_id": prediction.id,
            "top_disease": result["top_disease"],
            "confidence": result["confidence"],
            "risk_level": result["risk_level"],
            "all_scores": result["all_scores"],
            "recommendation": result["recommendation"],
        },
        message="Prediction generated successfully.",
        status_code=201,
    )

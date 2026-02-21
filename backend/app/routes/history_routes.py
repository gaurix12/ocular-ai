from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.prediction import Prediction
from app.utils.response import success_response, error_response

history_bp = Blueprint("history", __name__, url_prefix="")


@history_bp.route("/predictions", methods=["GET"])
@jwt_required()
def get_history():
    user_id = get_jwt_identity()

    predictions = (
        Prediction.query.filter_by(user_id=user_id)
        .order_by(Prediction.created_at.desc())
        .all()
    )

    return success_response(
        data=[p.to_dict() for p in predictions],
        message="Prediction history retrieved successfully.",
    )

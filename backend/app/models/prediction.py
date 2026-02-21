import uuid
from datetime import datetime
from app.extensions import db


class Prediction(db.Model):
    __tablename__ = "predictions"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    image_path = db.Column(db.String(512), nullable=True)
    top_disease = db.Column(db.String(120), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    risk_level = db.Column(
        db.Enum("Low", "Medium", "High", name="risk_level_enum"), nullable=False
    )
    recommendation = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    scores = db.relationship(
        "PredictionScore", backref="prediction", lazy=True, cascade="all, delete-orphan"
    )
    report = db.relationship(
        "Report", backref="prediction", lazy=True, uselist=False, cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "image_path": self.image_path,
            "top_disease": self.top_disease,
            "confidence": self.confidence,
            "risk_level": str(self.risk_level) if self.risk_level else None,
            "recommendation": self.recommendation,
            "all_scores": {s.disease_name: s.probability for s in self.scores},
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Prediction {self.id} - {self.top_disease}>"


class PredictionScore(db.Model):
    __tablename__ = "prediction_scores"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    prediction_id = db.Column(
        db.String(36), db.ForeignKey("predictions.id"), nullable=False
    )
    disease_name = db.Column(db.String(120), nullable=False)
    probability = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            "disease_name": self.disease_name,
            "probability": self.probability,
        }

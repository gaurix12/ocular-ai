import uuid
from datetime import datetime
from app.extensions import db


class Report(db.Model):
    __tablename__ = "reports"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    prediction_id = db.Column(
        db.String(36), db.ForeignKey("predictions.id"), nullable=False, unique=True
    )
    pdf_path = db.Column(db.String(512), nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "prediction_id": self.prediction_id,
            "pdf_path": self.pdf_path,
            "generated_at": self.generated_at.isoformat(),
        }

    def __repr__(self):
        return f"<Report {self.id}>"

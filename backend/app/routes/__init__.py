from app.routes.auth_routes import auth_bp
from app.routes.prediction_routes import prediction_bp
from app.routes.history_routes import history_bp
from app.routes.report_routes import report_bp

__all__ = ["auth_bp", "prediction_bp", "history_bp", "report_bp"]

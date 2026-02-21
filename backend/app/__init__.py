import os
from flask import Flask
from app.config import config_by_name
from app.extensions import db, migrate, jwt, cors, bcrypt


def create_app(config_name: str = None) -> Flask:
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # CORS Configuration
    origins = app.config.get("CORS_ORIGINS", "http://localhost:5173")
    if isinstance(origins, str) and "," in origins:
        origins = [o.strip() for o in origins.split(",")]
        
    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": origins,
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "supports_credentials": True
            }
        }
    )
    bcrypt.init_app(app)

    # Import models so Flask-Migrate can detect them
    from app.models import User, Prediction, PredictionScore, Report  # noqa: F401

    # Register blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.prediction_routes import prediction_bp
    from app.routes.history_routes import history_bp
    from app.routes.report_routes import report_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(report_bp)

    # Global error handlers
    @app.errorhandler(400)
    def bad_request(e):
        return {"status": "error", "message": "Bad request."}, 400

    @app.errorhandler(401)
    def unauthorized(e):
        return {"status": "error", "message": "Unauthorized."}, 401

    @app.errorhandler(403)
    def forbidden(e):
        return {"status": "error", "message": "Forbidden."}, 403

    @app.errorhandler(404)
    def not_found(e):
        return {"status": "error", "message": "Resource not found."}, 404

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return {"status": "error", "message": "File too large. Maximum size is 5MB."}, 413

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        return {"status": "error", "message": "Internal server error."}, 500

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {"status": "error", "message": "Token has expired."}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {"status": "error", "message": "Invalid token."}, 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {"status": "error", "message": "Authorization token is required."}, 401

    # Ensure upload/report dirs exist
    with app.app_context():
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
        os.makedirs(app.config["REPORTS_FOLDER"], exist_ok=True)

    return app

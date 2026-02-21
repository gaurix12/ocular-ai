import os
from flask import Flask, jsonify
from app.config import config_by_name
from app.extensions import db, migrate, jwt, cors, bcrypt

def create_app(config_name="development"):
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    
    # CORS setup - MUST be before blueprints
    # Use /api/.* to match /api/v1/auth/register, /api/v1/predict, etc.
    cors.init_app(
        app,
        resources={r"/api/.*": {
            "origins": app.config["CORS_ORIGINS"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type"],
            "supports_credentials": True,
            "max_age": 3600,
        }},
        send_wildcard=False,
    )

    with app.app_context():
        # Import models
        from app.models.user import User  # noqa: F401
        from app.models.prediction import Prediction  # noqa: F401
        from app.models.report import Report  # noqa: F401
        
        db.create_all()
        
        # Ensure dirs exist
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
        os.makedirs(app.config["REPORTS_FOLDER"], exist_ok=True)
    
    # Register blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.prediction_routes import prediction_bp
    from app.routes.history_routes import history_bp
    from app.routes.report_routes import report_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(prediction_bp, url_prefix="/api/v1")
    app.register_blueprint(history_bp, url_prefix="/api/v1")
    app.register_blueprint(report_bp, url_prefix="/api/v1")

    # Error handlers (return JSON consistent with API)
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"status": "error", "message": "Bad request."}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"status": "error", "message": "Unauthorized."}), 401

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"status": "error", "message": "Resource not found."}), 404

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        return jsonify({"status": "error", "message": "Internal server error."}), 500

    # JWT handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"status": "error", "message": "Token has expired."}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"status": "error", "message": "Invalid token."}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"status": "error", "message": "Authorization token is required."}), 401

    return app

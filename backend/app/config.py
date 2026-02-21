import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
    # Min 32 bytes for SHA256 HMAC (RFC 7518). Override via JWT_SECRET_KEY in production.
    JWT_SECRET_KEY = os.environ.get(
        "JWT_SECRET_KEY",
        "dev-jwt-secret-key-change-in-production-32chars",
    )
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES", 3600))  # 1 hour default
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_CONTENT_LENGTH", 5242880))
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "uploads")
    REPORTS_FOLDER = os.environ.get("REPORTS_FOLDER", "reports")
    CORS_ORIGINS = [
        o.strip()
        for o in os.environ.get(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:5173,http://localhost:3000",
        ).split(",")
        if o.strip()
    ]

    # Ollama LLM for report generation (local)
    OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "meditron:7b")
    OLLAMA_TIMEOUT = int(os.environ.get("OLLAMA_TIMEOUT", 120))

    # Path to the trained MobileNetV2 iris model.
    # Override via MODEL_PATH env var in production.
    MODEL_PATH = os.environ.get(
        "MODEL_PATH",
        os.path.join(
            os.path.dirname(__file__),       # backend/app/
            "../../dl_cnn/models/iris_model_corrupted.pth"

        )
    )


class DevelopmentConfig(Config):
    DEBUG = True
    # Use SQLite by default so app runs without PostgreSQL. Set DATABASE_URL for PostgreSQL.
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///iris_dev.db"
    )


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-jwt-secret"
    SECRET_KEY = "test-secret"
    WTF_CSRF_ENABLED = False
    # Point to the real model during tests too, or override in test fixtures
    MODEL_PATH = os.environ.get(
        "MODEL_PATH",
        os.path.join(
            os.path.dirname(__file__),
            "../../dl_cnn/models/iris_model_corrupted.pth"
        )
    )


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    # In production, always set MODEL_PATH explicitly via environment variable


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}

config = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
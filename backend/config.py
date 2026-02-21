import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key")
    UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
    REPORTS_FOLDER = os.path.join(os.getcwd(), "reports")
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB
    CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]
    JSON_SORT_KEYS = False

class DevelopmentConfig(Config):
    """Development configuration"""
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration"""
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    DEBUG = False

config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig
}
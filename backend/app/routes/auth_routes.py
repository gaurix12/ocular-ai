from flask import Blueprint, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db, bcrypt
from app.models.user import User
from app.utils.response import success_response, error_response
from app.utils.validators import validate_email, validate_password

auth_bp = Blueprint("auth", __name__, url_prefix="")


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user."""
    try:
        data = request.get_json(silent=True)
        if not data:
            return error_response("Invalid JSON payload.", 400)

        full_name = data.get("full_name", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        role = data.get("role", "patient")

        # Validation
        if not full_name:
            return error_response("Full name is required.", 400)

        if not validate_email(email):
            return error_response("Invalid email address.", 400)

        is_valid, msg = validate_password(password)
        if not is_valid:
            return error_response(msg, 400)

        if role not in ("patient", "doctor", "admin"):
            return error_response("Invalid role. Choose patient, doctor, or admin.", 400)

        if User.query.filter_by(email=email).first():
            return error_response("Email already registered.", 409)

        # Create user
        password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
        user = User(
            full_name=full_name,
            email=email,
            password_hash=password_hash,
            role=role,
        )
        db.session.add(user)
        db.session.commit()

        return success_response(
            data=user.to_dict(),
            message="User registered successfully.",
            status_code=201,
        )
    except Exception as e:
        db.session.rollback()
        return error_response(f"Registration failed: {str(e)}", 500)


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login user and return JWT token."""
    try:
        data = request.get_json(silent=True)
        if not data:
            return error_response("Invalid JSON payload.", 400)

        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return error_response("Email and password are required.", 400)

        user = User.query.filter_by(email=email).first()
        if not user or not bcrypt.check_password_hash(user.password_hash, password):
            return error_response("Invalid email or password.", 401)

        # Create JWT token (ensure role is string for JSON serialization)
        access_token = create_access_token(
            identity=user.id,
            additional_claims={"role": str(user.role), "full_name": user.full_name},
        )

        return success_response(
            data={
                "access_token": access_token,
                "user": user.to_dict(),
            },
            message="Login successful.",
            status_code=200,
        )
    except Exception as e:
        return error_response(f"Login failed: {str(e)}", 500)


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Return current authenticated user (for token verification)."""
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    if not user:
        return error_response("User not found.", 404)
    return success_response(data=user.to_dict(), message="User retrieved successfully.")

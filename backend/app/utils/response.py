from flask import jsonify


def success_response(data=None, message="Success", status_code=200):
    """Return success response."""
    return jsonify({
        "status": "success",
        "message": message,
        "data": data
    }), status_code


def error_response(message="Error", status_code=400):
    """Return error response."""
    return jsonify({
        "status": "error",
        "message": message,
        "data": None
    }), status_code

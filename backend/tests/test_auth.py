import json


def test_register_success(client):
    response = client.post(
        "/api/v1/auth/register",
        data=json.dumps(
            {
                "full_name": "Jane Doe",
                "email": "jane@example.com",
                "password": "SecurePass123",
                "role": "patient",
            }
        ),
        content_type="application/json",
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["status"] == "success"
    assert data["data"]["email"] == "jane@example.com"
    assert data["data"]["role"] == "patient"


def test_register_duplicate_email(client):
    payload = {
        "full_name": "Jane Doe",
        "email": "duplicate@example.com",
        "password": "SecurePass123",
        "role": "patient",
    }
    client.post(
        "/api/v1/auth/register",
        data=json.dumps(payload),
        content_type="application/json",
    )
    response = client.post(
        "/api/v1/auth/register",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 409


def test_register_invalid_email(client):
    response = client.post(
        "/api/v1/auth/register",
        data=json.dumps(
            {
                "full_name": "Bad Email",
                "email": "not-an-email",
                "password": "SecurePass123",
            }
        ),
        content_type="application/json",
    )
    assert response.status_code == 400


def test_register_short_password(client):
    response = client.post(
        "/api/v1/auth/register",
        data=json.dumps(
            {
                "full_name": "Short Pass",
                "email": "short@example.com",
                "password": "123",
            }
        ),
        content_type="application/json",
    )
    assert response.status_code == 400


def test_login_success(client):
    client.post(
        "/api/v1/auth/register",
        data=json.dumps(
            {
                "full_name": "Login User",
                "email": "loginuser@example.com",
                "password": "SecurePass123",
                "role": "doctor",
            }
        ),
        content_type="application/json",
    )
    response = client.post(
        "/api/v1/auth/login",
        data=json.dumps(
            {"email": "loginuser@example.com", "password": "SecurePass123"}
        ),
        content_type="application/json",
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "access_token" in data["data"]
    assert data["data"]["user"]["role"] == "doctor"


def test_login_wrong_password(client):
    client.post(
        "/api/v1/auth/register",
        data=json.dumps(
            {
                "full_name": "Wrong Pass",
                "email": "wrongpass@example.com",
                "password": "CorrectPass123",
            }
        ),
        content_type="application/json",
    )
    response = client.post(
        "/api/v1/auth/login",
        data=json.dumps(
            {"email": "wrongpass@example.com", "password": "WrongPass123"}
        ),
        content_type="application/json",
    )
    assert response.status_code == 401


def test_login_unknown_user(client):
    response = client.post(
        "/api/v1/auth/login",
        data=json.dumps({"email": "nobody@example.com", "password": "Pass1234"}),
        content_type="application/json",
    )
    assert response.status_code == 401

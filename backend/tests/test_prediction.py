import io
import json


def _register_and_login(client, email="pred@example.com"):
    client.post(
        "/api/v1/auth/register",
        data=json.dumps(
            {
                "full_name": "Predict User",
                "email": email,
                "password": "SecurePass123",
                "role": "patient",
            }
        ),
        content_type="application/json",
    )
    resp = client.post(
        "/api/v1/auth/login",
        data=json.dumps({"email": email, "password": "SecurePass123"}),
        content_type="application/json",
    )
    return resp.get_json()["data"]["access_token"]


def _make_image_bytes():
    # Minimal 1x1 PNG (valid image bytes)
    import base64
    png_b64 = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"
        "yPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    )
    return base64.b64decode(png_b64)


def test_predict_success(client):
    token = _register_and_login(client, "pred_success@example.com")
    image_bytes = _make_image_bytes()
    data = {"image": (io.BytesIO(image_bytes), "test.png")}
    response = client.post(
        "/api/v1/predict",
        data=data,
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body["status"] == "success"
    result = body["data"]
    assert "top_disease" in result
    assert "confidence" in result
    assert result["risk_level"] in ("Low", "Medium", "High")
    assert len(result["all_scores"]) == 6


def test_predict_no_auth(client):
    image_bytes = _make_image_bytes()
    data = {"image": (io.BytesIO(image_bytes), "test.png")}
    response = client.post(
        "/api/v1/predict",
        data=data,
        content_type="multipart/form-data",
    )
    assert response.status_code == 401


def test_predict_no_image(client):
    token = _register_and_login(client, "pred_noimg@example.com")
    response = client.post(
        "/api/v1/predict",
        data={},
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400


def test_history_endpoint(client):
    token = _register_and_login(client, "hist_user@example.com")
    image_bytes = _make_image_bytes()

    # Create a prediction first
    client.post(
        "/api/v1/predict",
        data={"image": (io.BytesIO(image_bytes), "test.png")},
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"},
    )

    response = client.get(
        "/api/v1/predictions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "success"
    assert isinstance(body["data"], list)
    assert len(body["data"]) >= 1


def test_history_no_auth(client):
    response = client.get("/api/v1/predictions")
    assert response.status_code == 401

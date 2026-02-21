from app.services.predictor import generate_mock_prediction, DISEASES


def test_mock_prediction_keys():
    result = generate_mock_prediction()
    assert "top_disease" in result
    assert "confidence" in result
    assert "risk_level" in result
    assert "all_scores" in result
    assert "recommendation" in result


def test_mock_prediction_probabilities_sum():
    result = generate_mock_prediction()
    total = sum(result["all_scores"].values())
    assert abs(total - 1.0) < 0.01


def test_mock_prediction_all_diseases_present():
    result = generate_mock_prediction()
    for disease in DISEASES:
        assert disease in result["all_scores"]


def test_mock_prediction_risk_levels():
    for _ in range(30):
        result = generate_mock_prediction()
        confidence = result["confidence"]
        risk = result["risk_level"]
        if confidence > 0.75:
            assert risk == "High"
        elif confidence >= 0.50:
            assert risk == "Medium"
        else:
            assert risk == "Low"


def test_mock_prediction_top_disease_matches_max():
    result = generate_mock_prediction()
    top = max(result["all_scores"], key=result["all_scores"].get)
    assert result["top_disease"] == top
    assert result["confidence"] == result["all_scores"][top]

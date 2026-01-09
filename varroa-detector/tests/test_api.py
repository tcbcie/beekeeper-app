"""API endpoint tests."""

import pytest
from fastapi.testclient import TestClient


# Note: These tests require a trained model to be present
# For CI/CD, mock the detector or use a small test model


def test_health_check():
    """Test health endpoint returns valid response."""
    from api.main import app

    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "model_loaded" in data
    assert "version" in data


def test_calculate_rate():
    """Test infestation rate calculation."""
    from api.main import app

    client = TestClient(app)
    response = client.post(
        "/calculate",
        json={"mite_count": 50, "days_on_board": 7}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_mites"] == 50
    assert data["days"] == 7
    assert data["daily_drop"] == pytest.approx(7.14, rel=0.01)
    assert data["level"] == "high"


def test_calculate_rate_low():
    """Test low infestation calculation."""
    from api.main import app

    client = TestClient(app)
    response = client.post(
        "/calculate",
        json={"mite_count": 3, "days_on_board": 7}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["level"] == "low"


def test_calculate_rate_invalid():
    """Test invalid calculation request."""
    from api.main import app

    client = TestClient(app)
    response = client.post(
        "/calculate",
        json={"mite_count": 10, "days_on_board": 0}
    )

    assert response.status_code == 422  # Validation error

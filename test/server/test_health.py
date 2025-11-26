"""
Tests for health endpoints
"""
import pytest
from fastapi.testclient import TestClient


@pytest.mark.api
class TestHealth:
    """Test health check endpoints"""
    
    def test_root_endpoint(self, client: TestClient):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "SharedLM API"
        assert data["version"] == "1.0.0"
        assert data["status"] == "running"
        assert "documentation" in data
    
    def test_health_check(self, client: TestClient):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
    
    def test_models_endpoint_no_user_id(self, client: TestClient):
        """Test models endpoint without user_id"""
        response = client.get("/models")
        assert response.status_code == 200
        data = response.json()
        assert "available_models" in data
        assert data["available_models"] == []
    
    def test_models_endpoint_with_user_id(self, client: TestClient, test_user, test_api_key):
        """Test models endpoint with user_id and API key"""
        response = client.get("/models", params={"user_id": test_user.id})
        assert response.status_code == 200
        data = response.json()
        assert "available_models" in data
        assert isinstance(data["available_models"], list)
        assert "openai" in data["available_models"]


"""
Tests for API keys endpoints
"""
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from test.fixtures.sample_data import SAMPLE_API_KEY


@pytest.mark.api
class TestAPIKeys:
    """Test API keys endpoints"""
    
    @patch('api.routes.api_keys.validate_api_key', new_callable=AsyncMock)
    def test_create_api_key_success(self, mock_validate, client: TestClient, test_user, auth_headers):
        """Test creating API key"""
        mock_validate.return_value = (True, "")
        
        response = client.post(
            f"/api-keys/{test_user.id}",
            json=SAMPLE_API_KEY,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "api_key" in data
        assert data["api_key"]["provider"] == SAMPLE_API_KEY["provider"]
        assert "key_preview" in data["api_key"]
    
    @patch('api.routes.api_keys.validate_api_key', new_callable=AsyncMock)
    def test_create_api_key_invalid_key(self, mock_validate, client: TestClient, test_user, auth_headers):
        """Test creating API key with invalid key"""
        mock_validate.return_value = (False, "Invalid API key")
        
        response = client.post(
            f"/api-keys/{test_user.id}",
            json=SAMPLE_API_KEY,
            headers=auth_headers
        )
        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data["detail"].lower()
    
    @patch('api.routes.api_keys.validate_api_key', new_callable=AsyncMock)
    def test_create_api_key_update_existing(self, mock_validate, client: TestClient, test_user, test_api_key, auth_headers):
        """Test updating existing API key"""
        mock_validate.return_value = (True, "")
        
        response = client.post(
            f"/api-keys/{test_user.id}",
            json={
                "provider": "openai",
                "api_key": "sk-new123456789",
                "key_name": "Updated Key"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "updated" in data["message"].lower()
    
    def test_get_api_keys_success(self, client: TestClient, test_user, test_api_key, auth_headers):
        """Test getting user API keys"""
        response = client.get(
            f"/api-keys/{test_user.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(key["provider"] == "openai" for key in data)
    
    def test_get_api_keys_empty(self, client: TestClient, test_user, auth_headers):
        """Test getting API keys for user with no keys"""
        response = client.get(
            f"/api-keys/{test_user.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_api_keys_unauthorized(self, client: TestClient, test_user_2, auth_headers):
        """Test getting API keys for another user (should fail)"""
        response = client.get(
            f"/api-keys/{test_user_2.id}",
            headers=auth_headers
        )
        assert response.status_code == 403
    
    def test_get_decrypted_key_success(self, client: TestClient, test_user, test_api_key, auth_headers):
        """Test getting decrypted API key"""
        response = client.get(
            f"/api-keys/{test_user.id}/openai/decrypt",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "openai"
        assert "api_key" in data
        assert data["api_key"] == "sk-test123456789"
    
    def test_get_decrypted_key_nonexistent(self, client: TestClient, test_user, auth_headers):
        """Test getting decrypted key for nonexistent API key"""
        response = client.get(
            f"/api-keys/{test_user.id}/anthropic/decrypt",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_delete_api_key_success(self, client: TestClient, test_user, test_api_key, auth_headers):
        """Test deleting API key"""
        response = client.delete(
            f"/api-keys/{test_user.id}/openai",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "deleted" in data["message"].lower()
        
        # Verify key is deleted
        get_response = client.get(
            f"/api-keys/{test_user.id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        keys = get_response.json()
        assert not any(key["provider"] == "openai" for key in keys)
    
    def test_delete_api_key_nonexistent(self, client: TestClient, test_user, auth_headers):
        """Test deleting nonexistent API key"""
        response = client.delete(
            f"/api-keys/{test_user.id}/anthropic",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    @patch('api.routes.api_keys.validate_api_key', new_callable=AsyncMock)
    def test_test_api_key_success(self, mock_validate, client: TestClient, test_user, test_api_key, auth_headers):
        """Test testing API key"""
        mock_validate.return_value = (True, "")
        
        response = client.post(
            f"/api-keys/{test_user.id}/openai/test",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "valid" in data["message"].lower()
    
    @patch('api.routes.api_keys.validate_api_key', new_callable=AsyncMock)
    def test_test_api_key_invalid(self, mock_validate, client: TestClient, test_user, test_api_key, auth_headers):
        """Test testing invalid API key"""
        mock_validate.return_value = (False, "Invalid API key")
        
        response = client.post(
            f"/api-keys/{test_user.id}/openai/test",
            headers=auth_headers
        )
        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data["detail"].lower() or "failed" in data["detail"].lower()
    
    def test_create_api_key_missing_provider(self, client: TestClient, test_user, auth_headers):
        """Test creating API key without provider"""
        response = client.post(
            f"/api-keys/{test_user.id}",
            json={"api_key": "sk-test123456789"},
            headers=auth_headers
        )
        assert response.status_code == 422  # Validation error
    
    def test_create_api_key_missing_api_key(self, client: TestClient, test_user, auth_headers):
        """Test creating API key without api_key value"""
        response = client.post(
            f"/api-keys/{test_user.id}",
            json={"provider": "openai"},
            headers=auth_headers
        )
        assert response.status_code == 400

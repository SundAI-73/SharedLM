"""
Tests for custom integrations endpoints
"""
import pytest
from fastapi.testclient import TestClient
from test.fixtures.sample_data import SAMPLE_CUSTOM_INTEGRATION


@pytest.mark.api
class TestCustomIntegrations:
    """Test custom integrations endpoints"""
    
    def test_create_custom_integration_success(self, client: TestClient, test_user, auth_headers):
        """Test creating custom integration"""
        response = client.post(
            f"/custom-integrations/{test_user.id}",
            json=SAMPLE_CUSTOM_INTEGRATION,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "integration" in data
        assert data["integration"]["name"] == SAMPLE_CUSTOM_INTEGRATION["name"]
        # provider_id is generated from name: "Test Custom Provider" -> "custom_test_custom_provider"
        assert data["integration"]["provider_id"] == "custom_test_custom_provider"
        assert "id" in data["integration"]
    
    def test_create_custom_integration_invalid_url(self, client: TestClient, test_user, auth_headers):
        """Test creating custom integration with invalid URL"""
        response = client.post(
            f"/custom-integrations/{test_user.id}",
            json={
                "name": "Test Integration",
                "base_url": "invalid-url",
                "api_type": "openai"
            },
            headers=auth_headers
        )
        # The endpoint validates URL and raises HTTPException with 400
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower() or "format" in response.json()["detail"].lower()
    
    def test_create_custom_integration_missing_name(self, client: TestClient, test_user, auth_headers):
        """Test creating custom integration without name"""
        response = client.post(
            f"/custom-integrations/{test_user.id}",
            json={
                "base_url": "https://api.example.com",
                "api_type": "openai"
            },
            headers=auth_headers
        )
        assert response.status_code == 422  # FastAPI returns 422 for validation errors
    
    def test_get_custom_integrations_success(self, client: TestClient, test_user, auth_headers, test_db):
        """Test getting user custom integrations"""
        from database import crud
        
        # Create a custom integration
        integration = crud.create_custom_integration(
            test_db,
            user_id=test_user.id,
            name="Test Integration",
            provider_id="custom_test",
            base_url="https://api.example.com",
            api_type="openai"
        )
        
        response = client.get(
            f"/custom-integrations/{test_user.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(int["id"] == integration.id for int in data)
    
    def test_get_custom_integrations_empty(self, client: TestClient, test_user, auth_headers):
        """Test getting custom integrations for user with no integrations"""
        response = client.get(
            f"/custom-integrations/{test_user.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_custom_integrations_unauthorized(self, client: TestClient, test_user_2, auth_headers):
        """Test getting custom integrations for another user (should fail)"""
        response = client.get(
            f"/custom-integrations/{test_user_2.id}",
            headers=auth_headers
        )
        assert response.status_code == 403
    
    def test_update_custom_integration_success(self, client: TestClient, test_user, auth_headers, test_db):
        """Test updating custom integration"""
        from database import crud
        
        # Create a custom integration
        integration = crud.create_custom_integration(
            test_db,
            user_id=test_user.id,
            name="Test Integration",
            provider_id="custom_test",
            base_url="https://api.example.com",
            api_type="openai"
        )
        
        response = client.patch(
            f"/custom-integrations/update/{integration.id}",
            json={
                "name": "Updated Integration",
                "base_url": "https://api.updated.com",
                "api_type": "openai"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["integration"]["name"] == "Updated Integration"
        assert data["integration"]["base_url"] == "https://api.updated.com"
    
    def test_update_custom_integration_nonexistent(self, client: TestClient, auth_headers):
        """Test updating nonexistent custom integration"""
        response = client.patch(
            "/custom-integrations/update/99999",
            json={
                "name": "Updated Integration",
                "base_url": "https://api.updated.com"
            },
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_delete_custom_integration_success(self, client: TestClient, test_user, auth_headers, test_db):
        """Test deleting custom integration"""
        from database import crud
        
        # Create a custom integration
        integration = crud.create_custom_integration(
            test_db,
            user_id=test_user.id,
            name="Test Integration",
            provider_id="custom_test",
            base_url="https://api.example.com",
            api_type="openai"
        )
        
        response = client.delete(
            f"/custom-integrations/delete/{integration.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "deleted" in data["message"].lower()
        
        # Verify integration is deleted
        get_response = client.get(
            f"/custom-integrations/{test_user.id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        integrations = get_response.json()
        assert not any(int["id"] == integration.id for int in integrations)
    
    def test_delete_custom_integration_nonexistent(self, client: TestClient, auth_headers):
        """Test deleting nonexistent custom integration"""
        response = client.delete(
            "/custom-integrations/delete/99999",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_delete_custom_integration_unauthorized(self, client: TestClient, test_user_2, auth_headers, test_db):
        """Test deleting another user's custom integration (should fail)"""
        from database import crud
        
        # Create a custom integration for user 2
        integration = crud.create_custom_integration(
            test_db,
            user_id=test_user_2.id,
            name="Test Integration",
            provider_id="custom_test",
            base_url="https://api.example.com",
            api_type="openai"
        )
        
        # Try to delete as user 1 (should fail)
        response = client.delete(
            f"/custom-integrations/delete/{integration.id}",
            headers=auth_headers
        )
        assert response.status_code == 403

"""
Tests for Mistral model validation
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


@pytest.mark.api
class TestMistralValidation:
    """Test Mistral model validation in chat"""
    
    @patch('api.routes.chat.route_chat')
    @patch('services.mem0_client.mem0_client.search_memories')
    def test_chat_with_valid_mistral_model(
        self,
        mock_search_memories,
        mock_route_chat,
        client: TestClient,
        test_user,
        test_api_key,
        auth_headers,
        test_db
    ):
        """Test chat with valid Mistral model"""
        # Create Anthropic API key (Mistral key)
        from database import crud
        from utils.encryption import encrypt_key
        import os
        
        os.environ["ENCRYPTION_KEY"] = os.environ.get("ENCRYPTION_KEY", "test_key")
        mistral_key = encrypt_key("mistral-test-key")
        
        crud.create_api_key(
            test_db,
            user_id=test_user.id,
            provider="mistral",
            encrypted_key=mistral_key,
            key_name="Test Mistral Key",
            key_preview="...key"
        )
        
        # Mock memory search
        mock_search_memories.return_value = []
        
        # Mock LLM response
        async def mock_llm_response(*args, **kwargs):
            return ("Hello from Mistral!", "mistral-small-latest")
        mock_route_chat.side_effect = mock_llm_response
        
        response = client.post(
            "/chat",
            json={
                "user_id": test_user.id,
                "message": "Hello",
                "model_provider": "mistral",
                "model_choice": "mistral-small-latest",
                "session_id": None,
                "project_id": None
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["used_model"] == "mistral-small-latest"
    
    def test_chat_with_invalid_mistral_model(self, client: TestClient, test_user, auth_headers, test_db):
        """Test chat with invalid Mistral model"""
        # Create Mistral API key
        from database import crud
        from utils.encryption import encrypt_key
        import os
        
        os.environ["ENCRYPTION_KEY"] = os.environ.get("ENCRYPTION_KEY", "test_key")
        mistral_key = encrypt_key("mistral-test-key")
        
        crud.create_api_key(
            test_db,
            user_id=test_user.id,
            provider="mistral",
            encrypted_key=mistral_key,
            key_name="Test Mistral Key",
            key_preview="...key"
        )
        
        response = client.post(
            "/chat",
            json={
                "user_id": test_user.id,
                "message": "Hello",
                "model_provider": "mistral",
                "model_choice": "invalid-model",
                "session_id": None,
                "project_id": None
            },
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "Invalid model" in response.json()["detail"]
        assert "mistral-small-latest" in response.json()["detail"] or "Available Mistral models" in response.json()["detail"]


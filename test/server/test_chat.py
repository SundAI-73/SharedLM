"""
Tests for chat endpoint
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from test.fixtures.sample_data import SAMPLE_CHAT_REQUEST


@pytest.mark.api
class TestChat:
    """Test chat endpoint"""
    
    @patch('api.routes.chat.route_chat', new_callable=AsyncMock)
    @patch('api.routes.chat.mem0_client')
    def test_chat_success(self, mock_mem0_client, mock_route_chat, client: TestClient, test_user, test_api_key, auth_headers):
        """Test successful chat request"""
        # Mock memory search - search_memories is called with asyncio.to_thread (sync function)
        mock_mem0_client.search_memories.return_value = ["Previous context memory"]
        
        # Mock LLM response - route_chat is async and returns tuple
        mock_route_chat.return_value = ("Hello! How can I help you?", "gpt-4o-mini")
        
        response = client.post(
            "/chat",
            json={
                "user_id": test_user.id,
                "message": "Hello",
                "model_provider": "openai",
                "model_choice": "gpt-4o-mini",
                "session_id": None,
                "project_id": None
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert data["reply"] == "Hello! How can I help you?"
        assert data["used_model"] == "gpt-4o-mini"
        assert "memories" in data
        assert "conversation_id" in data
    
    @patch('api.routes.chat.mem0_client')
    def test_chat_missing_api_key(self, mock_mem0_client, client: TestClient, test_user, auth_headers):
        """Test chat request without API key"""
        mock_mem0_client.search_memories.return_value = []
        
        response = client.post(
            "/chat",
            json={
                "user_id": test_user.id,
                "message": "Hello",
                "model_provider": "anthropic",
                "model_choice": "claude-3-5-sonnet-20241022",
                "session_id": None,
                "project_id": None
            },
            headers=auth_headers
        )
        assert response.status_code == 400
        data = response.json()
        assert "api key" in data["detail"].lower()
    
    @patch('api.routes.chat.route_chat', new_callable=AsyncMock)
    @patch('api.routes.chat.mem0_client')
    def test_chat_with_existing_conversation(self, mock_mem0_client, mock_route_chat, client: TestClient, test_user, test_api_key, test_conversation, auth_headers):
        """Test chat with existing conversation"""
        mock_mem0_client.search_memories.return_value = []
        mock_route_chat.return_value = ("Response", "gpt-4o-mini")
        
        response = client.post(
            "/chat",
            json={
                "user_id": test_user.id,
                "message": "Hello again",
                "model_provider": "openai",
                "model_choice": "gpt-4o-mini",
                "session_id": str(test_conversation.id),
                "project_id": None
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["conversation_id"] == test_conversation.id
    
    @patch('api.routes.chat.route_chat', new_callable=AsyncMock)
    @patch('api.routes.chat.mem0_client')
    def test_chat_with_project(self, mock_mem0_client, mock_route_chat, client: TestClient, test_user, test_api_key, test_project, auth_headers):
        """Test chat request with project"""
        mock_mem0_client.search_memories.return_value = []
        mock_route_chat.return_value = ("Response", "gpt-4o-mini")
        
        response = client.post(
            "/chat",
            json={
                "user_id": test_user.id,
                "message": "Hello",
                "model_provider": "openai",
                "model_choice": "gpt-4o-mini",
                "session_id": None,
                "project_id": test_project.id
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "conversation_id" in data
    
    @patch('api.routes.chat.mem0_client')
    def test_chat_empty_message(self, mock_mem0_client, client: TestClient, test_user, test_api_key, auth_headers):
        """Test chat with empty message"""
        mock_mem0_client.search_memories.return_value = []
        
        response = client.post(
            "/chat",
            json={
                "user_id": test_user.id,
                "message": "",
                "model_provider": "openai",
                "model_choice": "gpt-4o-mini",
                "session_id": None,
                "project_id": None
            },
            headers=auth_headers
        )
        assert response.status_code == 400
    
    @patch('api.routes.chat.mem0_client')
    def test_chat_unauthorized_user(self, mock_mem0_client, client: TestClient, test_user_2, test_api_key, auth_headers):
        """Test chat request for another user (should fail)"""
        mock_mem0_client.search_memories.return_value = []
        
        response = client.post(
            "/chat",
            json={
                "user_id": test_user_2.id,
                "message": "Hello",
                "model_provider": "openai",
                "model_choice": "gpt-4o-mini",
                "session_id": None,
                "project_id": None
            },
            headers=auth_headers
        )
        assert response.status_code == 403
    
    @patch('api.routes.chat.route_chat', new_callable=AsyncMock)
    @patch('api.routes.chat.mem0_client')
    def test_chat_llm_error(self, mock_mem0_client, mock_route_chat, client: TestClient, test_user, test_api_key, auth_headers):
        """Test chat when LLM returns error"""
        mock_mem0_client.search_memories.return_value = []
        mock_route_chat.side_effect = Exception("LLM API error")
        
        response = client.post(
            "/chat",
            json={
                "user_id": test_user.id,
                "message": "Hello",
                "model_provider": "openai",
                "model_choice": "gpt-4o-mini",
                "session_id": None,
                "project_id": None
            },
            headers=auth_headers
        )
        assert response.status_code == 500
    
    @patch('api.routes.chat.route_chat', new_callable=AsyncMock)
    @patch('api.routes.chat.mem0_client')
    def test_chat_memory_integration(self, mock_mem0_client, mock_route_chat, client: TestClient, test_user, test_api_key, auth_headers):
        """Test that memories are included in chat"""
        memories = ["User likes Python", "User works on AI projects"]
        mock_mem0_client.search_memories.return_value = memories
        mock_route_chat.return_value = ("Response", "gpt-4o-mini")
        
        response = client.post(
            "/chat",
            json={
                "user_id": test_user.id,
                "message": "What do I like?",
                "model_provider": "openai",
                "model_choice": "gpt-4o-mini",
                "session_id": None,
                "project_id": None
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["memories"] == memories
        # Verify route_chat was called
        assert mock_route_chat.called

"""
Tests for conversations endpoints
"""
import pytest
from fastapi.testclient import TestClient
from test.fixtures.sample_data import SAMPLE_CONVERSATION


@pytest.mark.api
class TestConversations:
    """Test conversations endpoints"""
    
    def test_get_conversations_success(self, client: TestClient, test_user, test_conversation, auth_headers):
        """Test getting user conversations"""
        response = client.get(
            f"/conversations/{test_user.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(c["id"] == test_conversation.id for c in data)
    
    def test_get_conversations_empty(self, client: TestClient, test_user, auth_headers):
        """Test getting conversations for user with no conversations"""
        response = client.get(
            f"/conversations/{test_user.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_conversations_unauthorized(self, client: TestClient, test_user_2, auth_headers):
        """Test getting conversations for another user (should fail)"""
        response = client.get(
            f"/conversations/{test_user_2.id}",
            headers=auth_headers
        )
        assert response.status_code == 403
    
    def test_get_messages_success(self, client: TestClient, test_user, test_conversation, auth_headers, test_db):
        """Test getting messages in a conversation"""
        from database import crud
        
        # Create a message in the conversation
        crud.create_message(
            test_db,
            conversation_id=test_conversation.id,
            role="user",
            content="Hello",
            model=None
        )
        
        response = client.get(
            f"/conversations/{test_conversation.id}/messages",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_get_messages_empty(self, client: TestClient, test_user, test_conversation, auth_headers):
        """Test getting messages from empty conversation"""
        response = client.get(
            f"/conversations/{test_conversation.id}/messages",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    def test_get_messages_unauthorized(self, client: TestClient, test_user_2, test_conversation, auth_headers):
        """Test getting messages from another user's conversation (should fail)"""
        response = client.get(
            f"/conversations/{test_conversation.id}/messages",
            headers={"X-User-ID": test_user_2.id}
        )
        assert response.status_code == 403
    
    def test_get_conversation_details_success(self, client: TestClient, test_user, test_conversation, auth_headers):
        """Test getting conversation details"""
        response = client.get(
            f"/conversations/{test_conversation.id}/details",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_conversation.id
        assert data["title"] == test_conversation.title
        assert "message_count" in data
        assert "created_at" in data
    
    def test_get_conversation_details_nonexistent(self, client: TestClient, auth_headers):
        """Test getting nonexistent conversation details"""
        response = client.get(
            "/conversations/99999/details",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_update_conversation_title_success(self, client: TestClient, test_user, test_conversation, auth_headers):
        """Test updating conversation title"""
        new_title = "Updated Title"
        response = client.patch(
            f"/conversations/{test_conversation.id}/title",
            json={"title": new_title},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["title"] == new_title
    
    def test_update_conversation_title_missing(self, client: TestClient, test_user, test_conversation, auth_headers):
        """Test updating conversation title without title"""
        response = client.patch(
            f"/conversations/{test_conversation.id}/title",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 400
    
    def test_update_conversation_success(self, client: TestClient, test_user, test_conversation, test_project, auth_headers):
        """Test updating conversation"""
        response = client.patch(
            f"/conversations/{test_conversation.id}",
            json={"project_id": test_project.id, "is_starred": True},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
    
    def test_toggle_star_conversation(self, client: TestClient, test_user, test_conversation, auth_headers):
        """Test toggling star status of conversation"""
        response = client.post(
            f"/conversations/{test_conversation.id}/star",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "is_starred" in data
    
    def test_delete_conversation_success(self, client: TestClient, test_user, test_conversation, auth_headers):
        """Test deleting conversation"""
        response = client.delete(
            f"/conversations/{test_conversation.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        # Verify conversation is deleted
        get_response = client.get(
            f"/conversations/{test_user.id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        conversations = get_response.json()
        assert not any(c["id"] == test_conversation.id for c in conversations)
    
    def test_delete_conversation_nonexistent(self, client: TestClient, auth_headers):
        """Test deleting nonexistent conversation"""
        response = client.delete(
            "/conversations/99999",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_create_conversation_success(self, client: TestClient, test_user, auth_headers):
        """Test creating new conversation"""
        response = client.post(
            "/conversations/create",
            json={
                "user_id": test_user.id,
                "title": "New Conversation",
                "model_used": "gpt-4o-mini"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == "New Conversation"
    
    def test_create_conversation_missing_user_id(self, client: TestClient, auth_headers):
        """Test creating conversation without user_id"""
        response = client.post(
            "/conversations/create",
            json={"title": "New Conversation"},
            headers=auth_headers
        )
        assert response.status_code == 400
    
    def test_create_conversation_with_project(self, client: TestClient, test_user, test_project, auth_headers):
        """Test creating conversation with project"""
        response = client.post(
            "/conversations/create",
            json={
                "user_id": test_user.id,
                "title": "Project Conversation",
                "project_id": test_project.id
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data

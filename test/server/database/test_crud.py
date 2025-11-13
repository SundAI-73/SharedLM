"""
Tests for database CRUD operations
"""
import pytest
from database import crud
from database.models import User, APIKey, Project, Conversation, Message, CustomIntegration, ProjectFile, PasswordResetToken


@pytest.mark.database
class TestUserCRUD:
    """Test user CRUD operations"""
    
    def test_create_user(self, test_db):
        """Test creating a user"""
        user = crud.create_user(
            test_db,
            user_id="test_user_crud",
            email="crud@example.com",
            password="password123",
            display_name="Test User"
        )
        assert user.id == "test_user_crud"
        assert user.email == "crud@example.com"
        assert user.display_name == "Test User"
        assert user.password_hash is not None
    
    def test_get_user_by_email(self, test_db, test_user):
        """Test getting user by email"""
        user = crud.get_user_by_email(test_db, test_user.email)
        assert user is not None
        assert user.email == test_user.email
        assert user.id == test_user.id
    
    def test_get_user_by_id(self, test_db, test_user):
        """Test getting user by ID"""
        user = crud.get_user_by_id(test_db, test_user.id)
        assert user is not None
        assert user.id == test_user.id
        assert user.email == test_user.email
    
    def test_verify_password(self, test_db):
        """Test password verification"""
        password = "testpassword123"
        user = crud.create_user(
            test_db,
            user_id="test_password",
            email="password@example.com",
            password=password,
            display_name="Test"
        )
        
        # Correct password
        assert crud.verify_password(password, user.password_hash) is True
        
        # Incorrect password
        assert crud.verify_password("wrongpassword", user.password_hash) is False


@pytest.mark.database
class TestAPIKeyCRUD:
    """Test API key CRUD operations"""
    
    def test_create_api_key(self, test_db, test_user):
        """Test creating an API key"""
        encrypted_key = "encrypted_key_value"
        api_key = crud.create_api_key(
            test_db,
            user_id=test_user.id,
            provider="anthropic",
            encrypted_key=encrypted_key,
            key_name="Test Key",
            key_preview="...789"
        )
        assert api_key.user_id == test_user.id
        assert api_key.provider == "anthropic"
        assert api_key.encrypted_key == encrypted_key
        assert api_key.key_preview == "...789"
        assert api_key.is_active is True
    
    def test_get_user_api_keys(self, test_db, test_user):
        """Test getting user API keys"""
        # Create multiple API keys
        crud.create_api_key(
            test_db,
            user_id=test_user.id,
            provider="openai",
            encrypted_key="key1",
            key_name="Key 1"
        )
        crud.create_api_key(
            test_db,
            user_id=test_user.id,
            provider="anthropic",
            encrypted_key="key2",
            key_name="Key 2"
        )
        
        keys = crud.get_user_api_keys(test_db, test_user.id)
        assert len(keys) >= 2
        assert any(key.provider == "openai" for key in keys)
        assert any(key.provider == "anthropic" for key in keys)
    
    def test_get_api_key(self, test_db, test_user):
        """Test getting specific API key"""
        crud.create_api_key(
            test_db,
            user_id=test_user.id,
            provider="mistral",
            encrypted_key="mistral_key",
            key_name="Mistral Key"
        )
        
        api_key = crud.get_api_key(test_db, test_user.id, "mistral")
        assert api_key is not None
        assert api_key.provider == "mistral"
        assert api_key.user_id == test_user.id


@pytest.mark.database
class TestProjectCRUD:
    """Test project CRUD operations"""
    
    def test_create_project(self, test_db, test_user):
        """Test creating a project"""
        project = crud.create_project(
            test_db,
            user_id=test_user.id,
            name="Test Project",
            project_type="chat"
        )
        assert project.user_id == test_user.id
        assert project.name == "Test Project"
        assert project.type == "chat"
        assert project.is_starred is False
    
    def test_get_user_projects(self, test_db, test_user):
        """Test getting user projects"""
        # Create multiple projects
        crud.create_project(test_db, test_user.id, "Project 1")
        crud.create_project(test_db, test_user.id, "Project 2")
        
        projects = crud.get_user_projects(test_db, test_user.id)
        assert len(projects) >= 2
        assert any(p.name == "Project 1" for p in projects)
        assert any(p.name == "Project 2" for p in projects)
    
    def test_update_project(self, test_db, test_user):
        """Test updating a project"""
        project = crud.create_project(test_db, test_user.id, "Original Name")
        
        updated = crud.update_project(
            test_db,
            project.id,
            name="Updated Name",
            is_starred=True
        )
        assert updated.name == "Updated Name"
        assert updated.is_starred is True
    
    def test_delete_project(self, test_db, test_user):
        """Test deleting a project"""
        project = crud.create_project(test_db, test_user.id, "To Delete")
        project_id = project.id
        
        result = crud.delete_project(test_db, project_id)
        assert result is True
        
        # Verify project is deleted
        projects = crud.get_user_projects(test_db, test_user.id)
        assert not any(p.id == project_id for p in projects)


@pytest.mark.database
class TestConversationCRUD:
    """Test conversation CRUD operations"""
    
    def test_create_conversation(self, test_db, test_user):
        """Test creating a conversation"""
        conversation = crud.create_conversation(
            test_db,
            user_id=test_user.id,
            title="Test Conversation",
            model_used="gpt-4o-mini"
        )
        assert conversation.user_id == test_user.id
        assert conversation.title == "Test Conversation"
        assert conversation.model_used == "gpt-4o-mini"
        assert conversation.message_count == 0
    
    def test_get_user_conversations(self, test_db, test_user):
        """Test getting user conversations"""
        crud.create_conversation(test_db, test_user.id, "Conv 1")
        crud.create_conversation(test_db, test_user.id, "Conv 2")
        
        conversations = crud.get_user_conversations(test_db, test_user.id)
        assert len(conversations) >= 2
    
    def test_get_conversation(self, test_db, test_user):
        """Test getting a specific conversation"""
        conversation = crud.create_conversation(test_db, test_user.id, "Specific Conv")
        
        retrieved = crud.get_conversation(test_db, conversation.id)
        assert retrieved is not None
        assert retrieved.id == conversation.id
        assert retrieved.title == "Specific Conv"
    
    def test_update_conversation_title(self, test_db, test_user):
        """Test updating conversation title"""
        conversation = crud.create_conversation(test_db, test_user.id, "Original Title")
        
        updated = crud.update_conversation_title(test_db, conversation.id, "New Title")
        assert updated.title == "New Title"


@pytest.mark.database
class TestMessageCRUD:
    """Test message CRUD operations"""
    
    def test_create_message(self, test_db, test_user):
        """Test creating a message"""
        conversation = crud.create_conversation(test_db, test_user.id, "Test Conv")
        
        message = crud.create_message(
            test_db,
            conversation_id=conversation.id,
            role="user",
            content="Hello",
            model=None
        )
        assert message.conversation_id == conversation.id
        assert message.role == "user"
        assert message.content == "Hello"
        
        # Verify conversation message_count was updated
        test_db.refresh(conversation)
        assert conversation.message_count == 1
    
    def test_get_conversation_messages(self, test_db, test_user):
        """Test getting conversation messages"""
        conversation = crud.create_conversation(test_db, test_user.id, "Test Conv")
        
        crud.create_message(test_db, conversation.id, "user", "Message 1")
        crud.create_message(test_db, conversation.id, "assistant", "Response 1")
        
        messages = crud.get_conversation_messages(test_db, conversation.id)
        assert len(messages) == 2
        assert messages[0].role == "user"
        assert messages[1].role == "assistant"


@pytest.mark.database
class TestCustomIntegrationCRUD:
    """Test custom integration CRUD operations"""
    
    def test_create_custom_integration(self, test_db, test_user):
        """Test creating a custom integration"""
        integration = crud.create_custom_integration(
            test_db,
            user_id=test_user.id,
            name="Test Integration",
            provider_id="custom_test",
            base_url="https://api.example.com",
            api_type="openai",
            logo_url="https://example.com/logo.png"
        )
        assert integration.user_id == test_user.id
        assert integration.name == "Test Integration"
        assert integration.provider_id == "custom_test"
        assert integration.base_url == "https://api.example.com"
        assert integration.is_active is True
    
    def test_get_user_custom_integrations(self, test_db, test_user):
        """Test getting user custom integrations"""
        crud.create_custom_integration(
            test_db,
            test_user.id,
            "Integration 1",
            "custom_int1"
        )
        crud.create_custom_integration(
            test_db,
            test_user.id,
            "Integration 2",
            "custom_int2"
        )
        
        integrations = crud.get_user_custom_integrations(test_db, test_user.id)
        assert len(integrations) >= 2
    
    def test_update_custom_integration(self, test_db, test_user):
        """Test updating a custom integration"""
        integration = crud.create_custom_integration(
            test_db,
            test_user.id,
            "Original Name",
            "custom_original"
        )
        
        updated = crud.update_custom_integration(
            test_db,
            integration.id,
            name="Updated Name",
            base_url="https://api.updated.com"
        )
        assert updated.name == "Updated Name"
        assert updated.base_url == "https://api.updated.com"
    
    def test_delete_custom_integration(self, test_db, test_user):
        """Test deleting a custom integration"""
        integration = crud.create_custom_integration(
            test_db,
            test_user.id,
            "To Delete",
            "custom_delete"
        )
        
        result = crud.delete_custom_integration(test_db, integration.id)
        assert result is True
        
        # Verify integration is deleted
        retrieved = crud.get_custom_integration(test_db, integration.id)
        assert retrieved is None


@pytest.mark.database
class TestProjectFileCRUD:
    """Test project file CRUD operations"""
    
    def test_create_project_file(self, test_db, test_user):
        """Test creating a project file"""
        project = crud.create_project(test_db, test_user.id, "Test Project")
        
        project_file = crud.create_project_file(
            test_db,
            project_id=project.id,
            filename="test.txt",
            file_size=100,
            storage_url="uploads/projects/test.txt"
        )
        assert project_file.project_id == project.id
        assert project_file.filename == "test.txt"
        assert project_file.file_size == 100
    
    def test_get_project_files(self, test_db, test_user):
        """Test getting project files"""
        project = crud.create_project(test_db, test_user.id, "Test Project")
        
        crud.create_project_file(
            test_db,
            project.id,
            "file1.txt",
            100,
            "uploads/projects/file1.txt"
        )
        crud.create_project_file(
            test_db,
            project.id,
            "file2.txt",
            200,
            "uploads/projects/file2.txt"
        )
        
        files = crud.get_project_files(test_db, project.id)
        assert len(files) == 2
    
    def test_delete_project_file(self, test_db, test_user):
        """Test deleting a project file"""
        project = crud.create_project(test_db, test_user.id, "Test Project")
        
        project_file = crud.create_project_file(
            test_db,
            project.id,
            "to_delete.txt",
            100,
            "uploads/projects/to_delete.txt"
        )
        
        result = crud.delete_project_file(test_db, project_file.id)
        assert result is True
        
        # Verify file is deleted
        files = crud.get_project_files(test_db, project.id)
        assert len(files) == 0


@pytest.mark.database
class TestPasswordResetTokenCRUD:
    """Test password reset token CRUD operations"""
    
    def test_create_password_reset_token(self, test_db, test_user):
        """Test creating a password reset token"""
        from datetime import datetime, timedelta
        import secrets
        
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        reset_token = crud.create_password_reset_token(
            test_db,
            user_id=test_user.id,
            token=token,
            expires_at=expires_at
        )
        
        assert reset_token.user_id == test_user.id
        assert reset_token.token == token
        assert reset_token.expires_at == expires_at
        assert reset_token.used is False
        assert reset_token.id is not None
    
    def test_create_password_reset_token_invalidates_existing(self, test_db, test_user):
        """Test that creating a new token invalidates existing unused tokens"""
        from datetime import datetime, timedelta
        import secrets
        
        # Create first token
        token1 = secrets.token_urlsafe(32)
        expires_at1 = datetime.utcnow() + timedelta(hours=1)
        token_record1 = crud.create_password_reset_token(
            test_db,
            user_id=test_user.id,
            token=token1,
            expires_at=expires_at1
        )
        
        # Verify first token exists and is not used
        retrieved1 = crud.get_password_reset_token(test_db, token1)
        assert retrieved1 is not None
        assert retrieved1.used is False
        
        # Create second token for same user
        token2 = secrets.token_urlsafe(32)
        expires_at2 = datetime.utcnow() + timedelta(hours=1)
        crud.create_password_reset_token(
            test_db,
            user_id=test_user.id,
            token=token2,
            expires_at=expires_at2
        )
        
        # Verify first token is now marked as used
        test_db.refresh(token_record1)
        assert token_record1.used is True
        
        # Verify second token is available
        retrieved2 = crud.get_password_reset_token(test_db, token2)
        assert retrieved2 is not None
        assert retrieved2.used is False
    
    def test_get_password_reset_token(self, test_db, test_user):
        """Test getting a password reset token"""
        from datetime import datetime, timedelta
        import secrets
        
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        crud.create_password_reset_token(
            test_db,
            user_id=test_user.id,
            token=token,
            expires_at=expires_at
        )
        
        retrieved = crud.get_password_reset_token(test_db, token)
        assert retrieved is not None
        assert retrieved.token == token
        assert retrieved.user_id == test_user.id
        assert retrieved.used is False
    
    def test_get_password_reset_token_not_found(self, test_db):
        """Test getting a non-existent password reset token"""
        retrieved = crud.get_password_reset_token(test_db, "nonexistent_token_12345")
        assert retrieved is None
    
    def test_get_password_reset_token_excludes_used(self, test_db, test_user):
        """Test that get_password_reset_token excludes used tokens"""
        from datetime import datetime, timedelta
        import secrets
        
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        token_record = crud.create_password_reset_token(
            test_db,
            user_id=test_user.id,
            token=token,
            expires_at=expires_at
        )
        
        # Mark token as used
        crud.mark_password_reset_token_used(test_db, token_record.id)
        
        # Try to get it - should return None since it's used
        retrieved = crud.get_password_reset_token(test_db, token)
        assert retrieved is None
    
    def test_mark_password_reset_token_used(self, test_db, test_user):
        """Test marking a password reset token as used"""
        from datetime import datetime, timedelta
        import secrets
        
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        token_record = crud.create_password_reset_token(
            test_db,
            user_id=test_user.id,
            token=token,
            expires_at=expires_at
        )
        
        # Verify token is not used initially
        assert token_record.used is False
        
        # Mark as used
        updated = crud.mark_password_reset_token_used(test_db, token_record.id)
        
        assert updated is not None
        assert updated.used is True
        assert updated.id == token_record.id
    
    def test_mark_password_reset_token_used_nonexistent(self, test_db):
        """Test marking a non-existent token as used"""
        result = crud.mark_password_reset_token_used(test_db, 99999)
        assert result is None
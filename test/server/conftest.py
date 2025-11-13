"""
Pytest configuration and fixtures for server tests
"""
import pytest
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from typing import Generator

# Add test root and apps/server to Python path
test_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
server_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../apps/server'))
sys.path.insert(0, test_root)
sys.path.insert(0, server_path)

# Set test environment before importing app
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from database.connection import Base, get_db
from database import models
from database import crud
import bcrypt
from cryptography.fernet import Fernet

# Import app after setting environment
from app import app

# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite:///:memory:"

# Test encryption key (32-byte key for Fernet)
TEST_ENCRYPTION_KEY = Fernet.generate_key().decode()


@pytest.fixture(scope="function")
def test_db():
    """
    Create a test database with all tables
    """
    # Create in-memory SQLite engine
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    """
    Create a test client for FastAPI app with test database
    """
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(test_db):
    """
    Create a test user
    """
    user_id = "test_user_123"
    email = "test@example.com"
    password = "testpassword123"
    display_name = "Test User"
    
    user = crud.create_user(
        test_db,
        user_id=user_id,
        email=email,
        password=password,
        display_name=display_name
    )
    
    return user


@pytest.fixture
def test_user_2(test_db):
    """
    Create a second test user
    """
    user_id = "test_user_456"
    email = "test2@example.com"
    password = "testpassword123"
    display_name = "Test User 2"
    
    user = crud.create_user(
        test_db,
        user_id=user_id,
        email=email,
        password=password,
        display_name=display_name
    )
    
    return user


@pytest.fixture
def test_api_key(test_db, test_user):
    """
    Create a test API key for the test user
    """
    import os
    from cryptography.fernet import Fernet
    
    # Set test encryption key in environment
    original_key = os.environ.get("ENCRYPTION_KEY")
    os.environ["ENCRYPTION_KEY"] = TEST_ENCRYPTION_KEY
    
    try:
        from utils.encryption import encrypt_key
        
        provider = "openai"
        api_key_value = "sk-test123456789"
        encrypted_key = encrypt_key(api_key_value)
        
        api_key = crud.create_api_key(
            test_db,
            user_id=test_user.id,
            provider=provider,
            encrypted_key=encrypted_key,
            key_name="Test OpenAI Key",
            key_preview="...789"
        )
        
        return api_key
    finally:
        if original_key:
            os.environ["ENCRYPTION_KEY"] = original_key
        elif "ENCRYPTION_KEY" in os.environ:
            del os.environ["ENCRYPTION_KEY"]


@pytest.fixture
def test_project(test_db, test_user):
    """
    Create a test project for the test user
    """
    project = crud.create_project(
        test_db,
        user_id=test_user.id,
        name="Test Project",
        project_type="chat"
    )
    
    return project


@pytest.fixture
def test_conversation(test_db, test_user):
    """
    Create a test conversation for the test user
    """
    conversation = crud.create_conversation(
        test_db,
        user_id=test_user.id,
        title="Test Conversation",
        model_used="gpt-4o-mini"
    )
    
    return conversation


@pytest.fixture
def auth_headers(test_user):
    """
    Get authentication headers for test user
    """
    return {"X-User-ID": test_user.id}


@pytest.fixture
def auth_headers_user_2(test_user_2):
    """
    Get authentication headers for second test user
    """
    return {"X-User-ID": test_user_2.id}


@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    """
    Set up test environment variables
    """
    monkeypatch.setenv("ENCRYPTION_KEY", TEST_ENCRYPTION_KEY)
    monkeypatch.setenv("DATABASE_URL", TEST_DATABASE_URL)
    monkeypatch.setenv("ENVIRONMENT", "test")
    # Mock Mem0 API key for tests (prevents real API calls)
    monkeypatch.setenv("mem0_api_key", "test_mem0_key")


@pytest.fixture
def mock_mem0_search():
    """Mock Mem0 memory search to return empty list"""
    from unittest.mock import patch
    with patch('services.mem0_client.mem0_client.search_memories') as mock:
        mock.return_value = []
        yield mock


@pytest.fixture
def mock_mem0_add():
    """Mock Mem0 memory add to return True"""
    from unittest.mock import patch
    with patch('services.mem0_client.mem0_client.add_memory') as mock:
        mock.return_value = True
        yield mock


@pytest.fixture
def mock_llm_router():
    """Mock LLM router to return test response"""
    from unittest.mock import patch
    async def mock_route_chat(*args, **kwargs):
        return ("Test LLM response", "gpt-4o-mini")
    
    with patch('api.routes.chat.route_chat') as mock:
        mock.side_effect = mock_route_chat
        yield mock


@pytest.fixture
def mock_api_key_validation():
    """Mock API key validation to return True"""
    from unittest.mock import patch
    async def mock_validate(*args, **kwargs):
        return (True, "")
    
    with patch('utils.api_key_validation.validate_api_key') as mock:
        mock.side_effect = mock_validate
        yield mock


@pytest.fixture
def test_custom_integration(test_db, test_user):
    """Create a test custom integration"""
    integration = crud.create_custom_integration(
        test_db,
        user_id=test_user.id,
        name="Test Custom Provider",
        provider_id="custom_test",
        base_url="https://api.example.com",
        api_type="openai",
        logo_url="https://example.com/logo.png"
    )
    
    return integration


@pytest.fixture
def test_project_file(test_db, test_project):
    """Create a test project file"""
    project_file = crud.create_project_file(
        test_db,
        project_id=test_project.id,
        filename="test.txt",
        file_size=1024,
        storage_url="uploads/projects/test.txt"
    )
    
    return project_file


@pytest.fixture
def test_message(test_db, test_conversation):
    """Create a test message"""
    message = crud.create_message(
        test_db,
        conversation_id=test_conversation.id,
        role="user",
        content="Test message",
        model="gpt-4o-mini"
    )
    
    return message


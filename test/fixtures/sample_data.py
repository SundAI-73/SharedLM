"""
Sample test data for tests
"""
from typing import Dict, Any

# Sample user data
SAMPLE_USER = {
    "email": "test@example.com",
    "password": "testpassword123",
    "display_name": "Test User"
}

SAMPLE_USER_2 = {
    "email": "test2@example.com",
    "password": "testpassword123",
    "display_name": "Test User 2"
}

# Sample API key data
SAMPLE_API_KEY = {
    "provider": "openai",
    "api_key": "sk-test123456789",
    "key_name": "Test OpenAI Key"
}

SAMPLE_API_KEY_ANTHROPIC = {
    "provider": "anthropic",
    "api_key": "sk-ant-test123456789",
    "key_name": "Test Anthropic Key"
}

# Sample project data
SAMPLE_PROJECT = {
    "name": "Test Project",
    "type": "chat"
}

SAMPLE_PROJECT_2 = {
    "name": "Test Project 2",
    "type": "document"
}

# Sample conversation data
SAMPLE_CONVERSATION = {
    "title": "Test Conversation",
    "model_used": "gpt-4o-mini"
}

# Sample message data
SAMPLE_MESSAGE = {
    "role": "user",
    "content": "Hello, how are you?",
    "model": "gpt-4o-mini"
}

SAMPLE_MESSAGE_ASSISTANT = {
    "role": "assistant",
    "content": "I'm doing well, thank you! How can I help you today?",
    "model": "gpt-4o-mini"
}

# Sample custom integration data
SAMPLE_CUSTOM_INTEGRATION = {
    "name": "Test Custom Provider",
    "base_url": "https://api.example.com",
    "api_type": "openai",
    "logo_url": "https://example.com/logo.png"
}

# Sample chat request
SAMPLE_CHAT_REQUEST = {
    "message": "Hello, how are you?",
    "model": "gpt-4o-mini",
    "conversation_id": None,
    "project_id": None,
    "stream": False
}


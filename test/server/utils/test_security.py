"""
Tests for security utilities
"""
import pytest
from fastapi import HTTPException
from utils.security import (
    validate_url, validate_name, validate_provider, validate_message,
    validate_file_upload, sanitize_error_message, sanitize_request_body
)


@pytest.mark.unit
class TestURLValidation:
    """Test URL validation"""
    
    def test_validate_url_valid(self):
        """Test validating valid URL"""
        url = validate_url("https://api.example.com", "Base URL")
        assert url == "https://api.example.com"
    
    def test_validate_url_http(self):
        """Test validating HTTP URL"""
        url = validate_url("http://localhost:8000", "Base URL")
        assert url == "http://localhost:8000"
    
    def test_validate_url_invalid_scheme(self):
        """Test validating URL with invalid scheme"""
        with pytest.raises(HTTPException) as exc_info:
            validate_url("ftp://example.com", "Base URL")
        assert exc_info.value.status_code == 400
        assert "http or https" in exc_info.value.detail.lower()
    
    def test_validate_url_too_long(self):
        """Test validating URL that is too long"""
        long_url = "https://example.com/" + "x" * 3000
        with pytest.raises(HTTPException) as exc_info:
            validate_url(long_url, "Base URL")
        assert exc_info.value.status_code == 400
    
    def test_validate_url_empty(self):
        """Test validating empty URL"""
        url = validate_url("", "Base URL")
        assert url == ""
    
    def test_validate_url_dangerous_content(self):
        """Test validating URL with dangerous content"""
        with pytest.raises(HTTPException) as exc_info:
            validate_url("https://example.com<script>alert('xss')</script>", "Base URL")
        assert exc_info.value.status_code == 400


@pytest.mark.unit
class TestNameValidation:
    """Test name validation"""
    
    def test_validate_name_valid(self):
        """Test validating valid name"""
        name = validate_name("Test Project", "Project name")
        assert name == "Test Project"
    
    def test_validate_name_empty(self):
        """Test validating empty name"""
        with pytest.raises(HTTPException) as exc_info:
            validate_name("", "Project name")
        assert exc_info.value.status_code == 400
    
    def test_validate_name_too_long(self):
        """Test validating name that is too long"""
        long_name = "x" * 300
        with pytest.raises(HTTPException) as exc_info:
            validate_name(long_name, "Project name")
        assert exc_info.value.status_code == 400
    
    def test_validate_name_dangerous_content(self):
        """Test validating name with dangerous content"""
        with pytest.raises(HTTPException) as exc_info:
            validate_name("<script>alert('xss')</script>", "Project name")
        assert exc_info.value.status_code == 400
    
    def test_validate_name_javascript(self):
        """Test validating name with javascript:"""
        with pytest.raises(HTTPException) as exc_info:
            validate_name("javascript:alert('xss')", "Project name")
        assert exc_info.value.status_code == 400


@pytest.mark.unit
class TestProviderValidation:
    """Test provider validation"""
    
    def test_validate_provider_valid(self):
        """Test validating valid provider"""
        provider = validate_provider("openai")
        assert provider == "openai"
    
    def test_validate_provider_with_underscore(self):
        """Test validating provider with underscore"""
        provider = validate_provider("custom_provider")
        assert provider == "custom_provider"
    
    def test_validate_provider_with_hyphen(self):
        """Test validating provider with hyphen"""
        provider = validate_provider("custom-provider")
        assert provider == "custom-provider"
    
    def test_validate_provider_empty(self):
        """Test validating empty provider"""
        with pytest.raises(HTTPException) as exc_info:
            validate_provider("")
        assert exc_info.value.status_code == 400
    
    def test_validate_provider_invalid_characters(self):
        """Test validating provider with invalid characters"""
        with pytest.raises(HTTPException) as exc_info:
            validate_provider("provider@name")
        assert exc_info.value.status_code == 400
    
    def test_validate_provider_too_long(self):
        """Test validating provider that is too long"""
        long_provider = "x" * 150
        with pytest.raises(HTTPException) as exc_info:
            validate_provider(long_provider)
        assert exc_info.value.status_code == 400


@pytest.mark.unit
class TestMessageValidation:
    """Test message validation"""
    
    def test_validate_message_valid(self):
        """Test validating valid message"""
        message = validate_message("Hello, how are you?")
        assert message == "Hello, how are you?"
    
    def test_validate_message_empty(self):
        """Test validating empty message"""
        with pytest.raises(HTTPException) as exc_info:
            validate_message("")
        assert exc_info.value.status_code == 400
    
    def test_validate_message_whitespace_only(self):
        """Test validating message with only whitespace"""
        with pytest.raises(HTTPException) as exc_info:
            validate_message("   ")
        assert exc_info.value.status_code == 400
    
    def test_validate_message_too_long(self):
        """Test validating message that is too long"""
        long_message = "x" * 100001
        with pytest.raises(HTTPException) as exc_info:
            validate_message(long_message)
        assert exc_info.value.status_code == 400


@pytest.mark.unit
class TestFileUploadValidation:
    """Test file upload validation"""
    
    def test_validate_file_upload_valid(self):
        """Test validating valid file upload"""
        validate_file_upload("test.pdf", 1024, "application/pdf")
        # Should not raise exception
    
    def test_validate_file_upload_missing_filename(self):
        """Test validating file upload without filename"""
        with pytest.raises(HTTPException) as exc_info:
            validate_file_upload("", 1024, "application/pdf")
        assert exc_info.value.status_code == 400
    
    def test_validate_file_upload_too_large(self):
        """Test validating file upload that is too large"""
        with pytest.raises(HTTPException) as exc_info:
            validate_file_upload("test.pdf", 11 * 1024 * 1024, "application/pdf")
        assert exc_info.value.status_code == 400
    
    def test_validate_file_upload_invalid_extension(self):
        """Test validating file upload with invalid extension"""
        with pytest.raises(HTTPException) as exc_info:
            validate_file_upload("test.exe", 1024, "application/x-msdownload")
        assert exc_info.value.status_code == 400
    
    def test_validate_file_upload_allowed_extensions(self):
        """Test validating file upload with allowed extensions"""
        allowed = ["pdf", "txt", "jpg", "png", "csv", "json"]
        for ext in allowed:
            validate_file_upload(f"test.{ext}", 1024, None)
            # Should not raise exception


@pytest.mark.unit
class TestErrorSanitization:
    """Test error message sanitization"""
    
    def test_sanitize_error_message_normal(self):
        """Test sanitizing normal error message"""
        error = ValueError("File not found")
        message = sanitize_error_message(error, "Default message")
        assert message == "File not found"
    
    def test_sanitize_error_message_password(self):
        """Test sanitizing error message with password"""
        error = ValueError("Invalid password: abc123")
        message = sanitize_error_message(error, "Default message")
        assert message == "Default message"
    
    def test_sanitize_error_message_api_key(self):
        """Test sanitizing error message with API key"""
        error = ValueError("Invalid api_key: sk-123456789")
        message = sanitize_error_message(error, "Default message")
        assert message == "Default message"
    
    def test_sanitize_error_message_token(self):
        """Test sanitizing error message with token"""
        error = ValueError("Invalid token: secret123")
        message = sanitize_error_message(error, "Default message")
        assert message == "Default message"


@pytest.mark.unit
class TestRequestBodySanitization:
    """Test request body sanitization"""
    
    def test_sanitize_request_body_normal(self):
        """Test sanitizing normal request body"""
        body = {
            "name": "Test Project",
            "type": "chat",
            "description": "A test project"
        }
        sanitized = sanitize_request_body(body)
        assert sanitized == body
    
    def test_sanitize_request_body_password(self):
        """Test sanitizing request body with password"""
        body = {
            "email": "test@example.com",
            "password": "secret123"
        }
        sanitized = sanitize_request_body(body)
        assert sanitized["email"] == "test@example.com"
        assert sanitized["password"] == "***REDACTED***"
    
    def test_sanitize_request_body_api_key(self):
        """Test sanitizing request body with API key"""
        body = {
            "provider": "openai",
            "api_key": "sk-123456789"
        }
        sanitized = sanitize_request_body(body)
        assert sanitized["provider"] == "openai"
        assert sanitized["api_key"] == "***REDACTED***"
    
    def test_sanitize_request_body_multiple_sensitive_fields(self):
        """Test sanitizing request body with multiple sensitive fields"""
        body = {
            "user_id": "user123",
            "current_password": "old123",
            "new_password": "new123",
            "api_key": "sk-123"
        }
        sanitized = sanitize_request_body(body)
        assert sanitized["user_id"] == "user123"
        assert sanitized["current_password"] == "***REDACTED***"
        assert sanitized["new_password"] == "***REDACTED***"
        assert sanitized["api_key"] == "***REDACTED***"

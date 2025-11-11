"""
Security utilities for input validation and sanitization
"""
import re
import logging
from typing import Optional
from urllib.parse import urlparse
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Maximum lengths for various inputs
MAX_NAME_LENGTH = 255
MAX_URL_LENGTH = 2048
MAX_MESSAGE_LENGTH = 100000
MAX_PROVIDER_LENGTH = 100

# Allowed URL schemes
ALLOWED_URL_SCHEMES = {'http', 'https'}

# Allowed file extensions for uploads
ALLOWED_FILE_EXTENSIONS = {
    'pdf', 'txt', 'md', 'doc', 'docx', 'csv', 'json', 'xml',
    'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp',
    'zip', 'tar', 'gz'
}

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024


def validate_url(url: str, field_name: str = "URL") -> str:
    """
    Validate and sanitize URL
    
    Args:
        url: URL string to validate
        field_name: Name of the field for error messages
        
    Returns:
        Validated URL string
        
    Raises:
        HTTPException: If URL is invalid
    """
    if not url or not url.strip():
        return url
    
    url = url.strip()
    
    # Check length
    if len(url) > MAX_URL_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} is too long (max {MAX_URL_LENGTH} characters)"
        )
    
    # Parse URL
    try:
        parsed = urlparse(url)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name} format"
        )
    
    # Check scheme
    if parsed.scheme and parsed.scheme.lower() not in ALLOWED_URL_SCHEMES:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must use http or https protocol"
        )
    
    # For base URLs, allow localhost and local IPs in development
    # But validate the format
    if parsed.netloc:
        # Check for dangerous patterns
        if any(dangerous in url.lower() for dangerous in ['<script', 'javascript:', 'onerror=']):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid {field_name}: contains potentially dangerous content"
            )
    
    return url


def validate_name(name: str, field_name: str = "Name") -> str:
    """
    Validate and sanitize name field
    
    Args:
        name: Name string to validate
        field_name: Name of the field for error messages
        
    Returns:
        Validated name string
        
    Raises:
        HTTPException: If name is invalid
    """
    if not name or not name.strip():
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} is required"
        )
    
    name = name.strip()
    
    # Check length
    if len(name) > MAX_NAME_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} is too long (max {MAX_NAME_LENGTH} characters)"
        )
    
    # Check for potentially dangerous content
    dangerous_patterns = [
        r'<script[^>]*>',
        r'javascript:',
        r'onerror=',
        r'onload=',
        r'onclick=',
        r'<iframe[^>]*>',
        r'<object[^>]*>',
        r'<embed[^>]*>'
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, name, re.IGNORECASE):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid {field_name}: contains potentially dangerous content"
            )
    
    return name


def validate_provider(provider: str) -> str:
    """
    Validate provider name
    
    Args:
        provider: Provider string to validate
        
    Returns:
        Validated provider string
        
    Raises:
        HTTPException: If provider is invalid
    """
    if not provider or not provider.strip():
        raise HTTPException(
            status_code=400,
            detail="Provider is required"
        )
    
    provider = provider.strip()
    
    # Check length
    if len(provider) > MAX_PROVIDER_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Provider name is too long (max {MAX_PROVIDER_LENGTH} characters)"
        )
    
    # Only allow alphanumeric, underscore, and hyphen
    if not re.match(r'^[a-zA-Z0-9_-]+$', provider):
        raise HTTPException(
            status_code=400,
            detail="Provider name can only contain letters, numbers, underscores, and hyphens"
        )
    
    return provider


def validate_message(message: str) -> str:
    """
    Validate chat message
    
    Args:
        message: Message string to validate
        
    Returns:
        Validated message string
        
    Raises:
        HTTPException: If message is invalid
    """
    if not message or not message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message is required"
        )
    
    message = message.strip()
    
    # Check length
    if len(message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Message is too long (max {MAX_MESSAGE_LENGTH} characters)"
        )
    
    return message


def validate_file_upload(filename: str, file_size: int, content_type: Optional[str] = None):
    """
    Validate file upload
    
    Args:
        filename: Name of the file
        file_size: Size of the file in bytes
        content_type: MIME type of the file (optional)
        
    Raises:
        HTTPException: If file is invalid
    """
    if not filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required"
        )
    
    # Check file size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed size ({MAX_FILE_SIZE // (1024 * 1024)}MB)"
        )
    
    # Check file extension
    file_ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if file_ext not in ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(sorted(ALLOWED_FILE_EXTENSIONS))}"
        )
    
    # Validate content type if provided
    if content_type:
        # Basic content type validation
        allowed_content_types = {
            'application/pdf',
            'text/plain',
            'text/markdown',
            'text/csv',
            'application/json',
            'application/xml',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/svg+xml',
            'image/webp',
            'application/zip',
            'application/x-tar',
            'application/gzip'
        }
        
        # Extract main content type (before semicolon)
        main_content_type = content_type.split(';')[0].strip().lower()
        if main_content_type not in allowed_content_types:
            logger.warning(f"Unexpected content type: {content_type} for file: {filename}")


def sanitize_error_message(error: Exception, default_message: str = "An error occurred") -> str:
    """
    Sanitize error messages to avoid exposing sensitive information
    
    Args:
        error: Exception object
        default_message: Default message to return if error should be hidden
        
    Returns:
        Sanitized error message
    """
    error_str = str(error)
    
    # List of patterns that might indicate sensitive information
    sensitive_patterns = [
        r'password',
        r'api[_\s]?key',
        r'token',
        r'secret',
        r'encryption[_\s]?key',
        r'credentials',
        r'connection[_\s]?string',
        r'database[_\s]?url',
        r'sql',
        r'traceback',
        r'file[_\s]?path',
        r'absolute[_\s]?path'
    ]
    
    # Check if error message contains sensitive information
    for pattern in sensitive_patterns:
        if re.search(pattern, error_str, re.IGNORECASE):
            logger.error(f"Sensitive error detected: {type(error).__name__}")
            return default_message
    
    # Return error message if it doesn't contain sensitive information
    return error_str


def sanitize_request_body(body: dict, sensitive_fields: list = None) -> dict:
    """
    Sanitize request body for logging by removing sensitive fields
    
    Args:
        body: Request body dictionary
        sensitive_fields: List of field names to remove (default: common sensitive fields)
        
    Returns:
        Sanitized dictionary
    """
    if sensitive_fields is None:
        sensitive_fields = [
            'password',
            'current_password',
            'new_password',
            'api_key',
            'apiKey',
            'token',
            'secret',
            'encryption_key'
        ]
    
    sanitized = body.copy()
    for field in sensitive_fields:
        if field in sanitized:
            sanitized[field] = "***REDACTED***"
    
    return sanitized


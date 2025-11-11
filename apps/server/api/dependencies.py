"""
Shared dependencies for API routes
Centralizes common dependencies to avoid repetition
"""

from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
from database.connection import get_db
from database import crud
from database.models import User, APIKey, CustomIntegration, Project, Conversation
from config.settings import settings

# DATABASE DEPENDENCY

def get_database_session():
    """
    Dependency for database session
    Usage: db: Session = Depends(get_database_session)
    """
    return get_db

# USER AUTHENTICATION DEPENDENCY

async def get_current_user(
    user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current user from header and validate authentication
    Usage: current_user: User = Depends(get_current_user)
    
    Note: This is a basic implementation. For production, implement JWT token validation.
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Validate user_id format (basic validation)
    if not isinstance(user_id, str) or len(user_id) > 100:
        raise HTTPException(status_code=401, detail="Invalid user ID format")
    
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    return user


# AUTHORIZATION HELPERS

def verify_user_ownership(user: User, resource_user_id: str, resource_type: str = "resource"):
    """
    Verify that the authenticated user owns the resource
    
    Args:
        user: Authenticated user object
        resource_user_id: User ID associated with the resource
        resource_type: Type of resource for error message
        
    Raises:
        HTTPException: If user doesn't own the resource
    """
    if user.id != resource_user_id:
        raise HTTPException(
            status_code=403,
            detail=f"You don't have permission to access this {resource_type}"
        )


async def verify_api_key_ownership(
    user: User,
    provider: str,
    db: Session = Depends(get_db)
) -> APIKey:
    """
    Verify that the user owns the API key for the given provider
    
    Args:
        user: Authenticated user object
        provider: Provider name
        db: Database session
        
    Returns:
        APIKey object
        
    Raises:
        HTTPException: If API key doesn't exist or user doesn't own it
    """
    api_key = crud.get_api_key(db, user.id, provider)
    if not api_key:
        raise HTTPException(
            status_code=404,
            detail=f"API key for {provider} not found"
        )
    
    # Double check ownership (should already be filtered by user_id in crud)
    if api_key.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to access this API key"
        )
    
    return api_key


async def verify_integration_ownership(
    user: User,
    integration_id: int,
    db: Session = Depends(get_db)
) -> CustomIntegration:
    """
    Verify that the user owns the custom integration
    
    Args:
        user: Authenticated user object
        integration_id: Integration ID
        db: Database session
        
    Returns:
        CustomIntegration object
        
    Raises:
        HTTPException: If integration doesn't exist or user doesn't own it
    """
    integration = crud.get_custom_integration(db, integration_id)
    if not integration:
        raise HTTPException(
            status_code=404,
            detail="Custom integration not found"
        )
    
    if integration.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to access this integration"
        )
    
    return integration


async def verify_project_ownership(
    user: User,
    project_id: int,
    db: Session = Depends(get_db)
) -> Project:
    """
    Verify that the user owns the project
    
    Args:
        user: Authenticated user object
        project_id: Project ID
        db: Database session
        
    Returns:
        Project object
        
    Raises:
        HTTPException: If project doesn't exist or user doesn't own it
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )
    
    if project.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to access this project"
        )
    
    return project


async def verify_conversation_ownership(
    user: User,
    conversation_id: int,
    db: Session = Depends(get_db)
) -> Conversation:
    """
    Verify that the user owns the conversation
    
    Args:
        user: Authenticated user object
        conversation_id: Conversation ID
        db: Database session
        
    Returns:
        Conversation object
        
    Raises:
        HTTPException: If conversation doesn't exist or user doesn't own it
    """
    conversation = crud.get_conversation(db, conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found"
        )
    
    if conversation.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to access this conversation"
        )
    
    return conversation

# OPTIONAL: API KEY VALIDATION

async def verify_api_key(
    api_key: Optional[str] = Header(None, alias="X-API-Key")
):
    """
    Verify API key if you want to add API authentication
    Usage: _ = Depends(verify_api_key)
    """
    # For now, just pass through
    return True

# RATE LIMITING DEPENDENCY (Future)

async def rate_limit_check(
    user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Check rate limits for user
    TODO: Implement actual rate limiting logic
    """
    # Placeholder for future rate limiting
    return True

# PAGINATION DEPENDENCY

class PaginationParams:
    """
    Common pagination parameters
    Usage: pagination: PaginationParams = Depends()
    """
    def __init__(
        self,
        skip: int = 0,
        limit: int = 50,
        sort_by: Optional[str] = "created_at",
        sort_order: Optional[str] = "desc"
    ):
        self.skip = skip
        self.limit = min(limit, 100)  # Max 100 items per page
        self.sort_by = sort_by
        self.sort_order = sort_order

# COMMON RESPONSE FORMATTERS

def format_timestamp(dt):
    """Format datetime to ISO string"""
    return str(dt) if dt else None

def success_response(message: str = "Success", **kwargs):
    """Standard success response"""
    return {
        "success": True,
        "message": message,
        **kwargs
    }

def error_response(message: str = "Error", status_code: int = 500):
    """Standard error response"""
    raise HTTPException(status_code=status_code, detail=message)
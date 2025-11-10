"""
Shared dependencies for API routes
Centralizes common dependencies to avoid repetition
"""

from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
from database.connection import get_db
from database import crud
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
):
    """
    Get current user from header
    Usage: current_user = Depends(get_current_user)
    
    For now, just validates user exists in database
    Later: Add JWT token validation here
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    
    return user

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
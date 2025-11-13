import logging
import uuid
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from database import crud
from database.models import User
from models.schemas import UserCreate, UserLogin, ForgotPasswordRequest, ResetPasswordRequest
from utils.security import sanitize_error_message
from utils.email import send_password_reset_email
from config.settings import settings
from api.dependencies import get_current_user, verify_user_ownership

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/signup")
async def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """User registration"""
    try:
        existing_user = crud.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        
        user = crud.create_user(
            db,
            user_id=user_id,
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.display_name
        )
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "display_name": user.display_name
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to create account"))

@router.post("/login")
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """User login"""
    try:
        user = crud.get_user_by_email(db, credentials.email)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not crud.verify_password(credentials.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "display_name": user.display_name
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to login"))
    
@router.post("/change-password")
async def change_password(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    try:
        user_id = data.get('user_id')
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not all([user_id, current_password, new_password]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Verify user ownership
        verify_user_ownership(current_user, user_id, "account")
        
        # Get user
        user = crud.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not crud.verify_password(current_password, user.password_hash):
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        
        # Validate new password
        if len(new_password) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
        
        # Hash new password
        import bcrypt
        new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update password
        user.password_hash = new_hash
        db.commit()
        
        logger.info(f"Password changed for user {user_id}")
        
        return {
            "success": True,
            "message": "Password changed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change password error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to change password"))

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request password reset"""
    try:
        user = crud.get_user_by_email(db, request.email)
        
        # Don't reveal if email exists for security reasons
        # Always return success message
        if user:
            # Generate secure token
            reset_token = secrets.token_urlsafe(32)
            
            # Set expiration to 1 hour from now
            expires_at = datetime.utcnow() + timedelta(hours=1)
            
            # Create reset token in database
            crud.create_password_reset_token(db, user.id, reset_token, expires_at)
            
            # Send email
            send_password_reset_email(
                email=user.email,
                reset_token=reset_token,
                frontend_url=settings.frontend_url
            )
        
        # Always return success to prevent email enumeration
        return {
            "success": True,
            "message": "If an account with that email exists, a password reset link has been sent."
        }
        
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        # Still return success to prevent email enumeration
        return {
            "success": True,
            "message": "If an account with that email exists, a password reset link has been sent."
        }

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token"""
    try:
        # Get token from database
        token_record = crud.get_password_reset_token(db, request.token)
        
        if not token_record:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        # Check if token is expired
        if datetime.utcnow() > token_record.expires_at:
            raise HTTPException(status_code=400, detail="Reset token has expired")
        
        # Validate new password
        if len(request.new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        
        # Get user
        user = crud.get_user_by_id(db, token_record.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Hash new password
        import bcrypt
        new_hash = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update password
        user.password_hash = new_hash
        db.commit()
        
        # Mark token as used
        crud.mark_password_reset_token_used(db, token_record.id)
        
        logger.info(f"Password reset completed for user {user.id}")
        
        return {
            "success": True,
            "message": "Password has been reset successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to reset password"))
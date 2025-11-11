import logging
import os
import bcrypt
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from database.connection import get_db
from database import crud
from database.models import APIKey, User
from models.schemas import APIKeyCreate, APIKeyResponse
from utils.encryption import encrypt_key, decrypt_key

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api-keys", tags=["api_keys"])

@router.get("/{user_id}", response_model=List[APIKeyResponse])
async def get_api_keys(user_id: str, db: Session = Depends(get_db)):
    """Get all API keys for user"""
    try:
        api_keys = crud.get_user_api_keys(db, user_id)
        return [
            APIKeyResponse(
                id=key.id,
                provider=key.provider,
                key_name=key.key_name,
                key_preview=key.key_preview,
                is_active=key.is_active,
                created_at=str(key.created_at),
                updated_at=str(key.updated_at)
            )
            for key in api_keys
        ]
    except Exception as e:
        logger.error(f"Get API keys error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{user_id}")
async def create_api_key(
    user_id: str, 
    api_key_data: APIKeyCreate, 
    db: Session = Depends(get_db)
):
    """Create or update API key for user"""
    try:
        # Validate provider and API key
        if not api_key_data.provider:
            raise HTTPException(status_code=400, detail="Provider is required")
        if not api_key_data.api_key or not api_key_data.api_key.strip():
            raise HTTPException(status_code=400, detail="API key is required")
        
        # Verify user exists in database, create if missing (for development)
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # For development: auto-create user if missing
            # In production, users should be created through proper authentication
            if os.getenv("ENVIRONMENT", "development") == "development" or os.getenv("AUTO_CREATE_USER", "false").lower() == "true":
                logger.warning(f"User {user_id} not found, auto-creating for development")
                try:
                    # Check if email already exists (might have been created with different user_id)
                    placeholder_email = f"{user_id}@local.dev"
                    existing_user_by_email = db.query(User).filter(User.email == placeholder_email).first()
                    
                    if existing_user_by_email:
                        # Email exists but with different user_id - this shouldn't happen, but handle it
                        logger.error(f"Email {placeholder_email} already exists with different user_id {existing_user_by_email.id}")
                        raise HTTPException(
                            status_code=409,
                            detail="User email conflict. Please clear your browser data and try again."
                        )
                    
                    # Create a minimal user record for development
                    # Create user with a dummy password (won't be used for API key operations)
                    dummy_password_hash = bcrypt.hashpw(b"dummy", bcrypt.gensalt()).decode('utf-8')
                    user = User(
                        id=user_id,
                        email=placeholder_email,
                        password_hash=dummy_password_hash,
                        display_name=user_id.replace('user_', 'User ').replace('_', ' ').title()
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
                    logger.info(f"Auto-created user {user_id} for development")
                except HTTPException:
                    raise
                except Exception as create_error:
                    logger.error(f"Failed to auto-create user {user_id}: {create_error}", exc_info=True)
                    db.rollback()
                    raise HTTPException(
                        status_code=500,
                        detail=f"User not found and could not be created: {str(create_error)}. Please sign up or log in first."
                    )
            else:
                logger.error(f"User {user_id} not found in database")
                raise HTTPException(
                    status_code=404, 
                    detail=f"User not found. Please sign up or log in first."
                )
        
        # Check if key already exists for this provider (active or inactive)
        # We need to check ALL keys, not just active ones, to avoid duplicates
        existing_key = db.query(APIKey).filter(
            APIKey.user_id == user_id,
            APIKey.provider == api_key_data.provider
        ).first()
        
        # Calculate key preview from original key (before encryption)
        key_preview = f"...{api_key_data.api_key.strip()[-6:]}" if len(api_key_data.api_key.strip()) >= 6 else f"...{api_key_data.api_key.strip()}"
        
        # Encrypt the API key
        try:
            encrypted_key = encrypt_key(api_key_data.api_key.strip())
        except ValueError as e:
            logger.error(f"Encryption error for {api_key_data.provider}: {e}", exc_info=True)
            raise HTTPException(
                status_code=500, 
                detail=f"Encryption failed: {str(e)}. Please check ENCRYPTION_KEY configuration."
            )
        
        if existing_key:
            # Update existing key
            existing_key.encrypted_key = encrypted_key
            existing_key.key_preview = key_preview
            existing_key.is_active = True
            if api_key_data.key_name:
                existing_key.key_name = api_key_data.key_name
            db.commit()
            db.refresh(existing_key)
            
            logger.info(f"Updated API key for {user_id} - {api_key_data.provider}")
            
            return {
                "success": True,
                "message": f"{api_key_data.provider} API key updated",
                "api_key": {
                    "id": existing_key.id,
                    "provider": existing_key.provider,
                    "key_preview": existing_key.key_preview
                }
            }
        else:
            # Create new key - pass key_preview separately
            api_key = crud.create_api_key(
                db,
                user_id=user_id,
                provider=api_key_data.provider,
                encrypted_key=encrypted_key,
                key_name=api_key_data.key_name or f"{api_key_data.provider} API Key",
                key_preview=key_preview
            )
            
            logger.info(f"Created API key for {user_id} - {api_key_data.provider}")
            
            return {
                "success": True,
                "message": f"{api_key_data.provider} API key created",
                "api_key": {
                    "id": api_key.id,
                    "provider": api_key.provider,
                    "key_preview": api_key.key_preview
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create API key error for {api_key_data.provider if 'api_key_data' in locals() else 'unknown'}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create API key: {str(e)}")

@router.get("/{user_id}/{provider}/decrypt")
async def get_decrypted_key(
    user_id: str, 
    provider: str, 
    db: Session = Depends(get_db)
):
    """Get decrypted API key for use"""
    try:
        api_key = crud.get_api_key(db, user_id, provider)
        
        if not api_key:
            raise HTTPException(status_code=404, detail=f"No API key found for {provider}")
        
        decrypted_key = decrypt_key(api_key.encrypted_key)
        
        return {
            "provider": provider,
            "api_key": decrypted_key
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get decrypted key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{user_id}/{provider}")
async def delete_api_key(
    user_id: str, 
    provider: str, 
    db: Session = Depends(get_db)
):
    """Delete API key for provider"""
    try:
        api_key = crud.get_api_key(db, user_id, provider)
        
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        db.delete(api_key)
        db.commit()
        
        logger.info(f"Deleted API key for {user_id} - {provider}")
        
        return {
            "success": True,
            "message": f"{provider} API key deleted"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete API key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{user_id}/{provider}/test")
async def test_api_key(
    user_id: str,
    provider: str,
    db: Session = Depends(get_db)
):
    """Test API key connection"""
    try:
        api_key = crud.get_api_key(db, user_id, provider)
        
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        decrypted_key = decrypt_key(api_key.encrypted_key)
        
        # Validate key format
        if provider == 'openai' and not decrypted_key.startswith('sk-'):
            raise HTTPException(status_code=400, detail="Invalid OpenAI API key format")
        if provider == 'anthropic' and not decrypted_key.startswith('sk-ant-'):
            raise HTTPException(status_code=400, detail="Invalid Anthropic API key format")
        
        logger.info(f"API key test successful for {user_id} - {provider}")
        
        return {
            "success": True,
            "message": f"{provider} API key is valid",
            "provider": provider
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Test API key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
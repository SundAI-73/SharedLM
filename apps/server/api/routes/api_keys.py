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
from utils.cache import clear_api_key_cache
from api.dependencies import get_current_user, verify_user_ownership, verify_api_key_ownership
from utils.security import validate_provider, sanitize_error_message, sanitize_request_body

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api-keys", tags=["api_keys"])

@router.get("/{user_id}", response_model=List[APIKeyResponse])
async def get_api_keys(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all API keys for user"""
    try:
        # Verify user owns the requested resources
        verify_user_ownership(current_user, user_id, "API keys")
        
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get API keys error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to retrieve API keys"))

@router.post("/{user_id}")
async def create_api_key(
    user_id: str, 
    api_key_data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update API key for user"""
    try:
        # Verify user owns the requested resources
        verify_user_ownership(current_user, user_id, "API keys")
        
        # Validate provider
        validated_provider = validate_provider(api_key_data.provider)
        
        # Validate API key
        if not api_key_data.api_key or not api_key_data.api_key.strip():
            raise HTTPException(status_code=400, detail="API key is required")
        
        api_key_value = api_key_data.api_key.strip()
        
        # Check if key already exists for this provider (active or inactive)
        existing_key = db.query(APIKey).filter(
            APIKey.user_id == user_id,
            APIKey.provider == validated_provider
        ).first()
        
        # Calculate key preview from original key (before encryption)
        key_preview = f"...{api_key_value[-6:]}" if len(api_key_value) >= 6 else f"...{api_key_value}"
        
        # Encrypt the API key
        try:
            encrypted_key = encrypt_key(api_key_value)
        except ValueError as e:
            logger.error(f"Encryption error for {validated_provider}: {e}", exc_info=True)
            raise HTTPException(
                status_code=500, 
                detail="Failed to encrypt API key. Please contact support."
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
            
            # Clear cache when API key is updated
            clear_api_key_cache(user_id, validated_provider)
            
            logger.info(f"Updated API key for {user_id} - {validated_provider}")
            
            return {
                "success": True,
                "message": f"{validated_provider} API key updated",
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
                provider=validated_provider,
                encrypted_key=encrypted_key,
                key_name=api_key_data.key_name or f"{validated_provider} API Key",
                key_preview=key_preview
            )
            
            # Clear cache when new API key is created (in case old cached key exists)
            clear_api_key_cache(user_id, validated_provider)
            
            logger.info(f"Created API key for {user_id} - {validated_provider}")
            
            return {
                "success": True,
                "message": f"{validated_provider} API key created",
                "api_key": {
                    "id": api_key.id,
                    "provider": api_key.provider,
                    "key_preview": api_key.key_preview
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create API key error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to create API key"))

@router.get("/{user_id}/{provider}/decrypt")
async def get_decrypted_key(
    user_id: str, 
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get decrypted API key for use"""
    try:
        # Verify user ownership
        verify_user_ownership(current_user, user_id, "API keys")
        
        # Verify API key ownership
        api_key = await verify_api_key_ownership(current_user, provider, db)
        
        decrypted_key = decrypt_key(api_key.encrypted_key)
        
        return {
            "provider": provider,
            "api_key": decrypted_key
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get decrypted key error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to retrieve API key"))

@router.delete("/{user_id}/{provider}")
async def delete_api_key(
    user_id: str, 
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete API key for provider"""
    try:
        # Verify user ownership
        verify_user_ownership(current_user, user_id, "API keys")
        
        # Verify API key ownership
        api_key = await verify_api_key_ownership(current_user, provider, db)
        
        db.delete(api_key)
        db.commit()
        
        # Clear cache when API key is deleted
        clear_api_key_cache(user_id, provider)
        
        logger.info(f"Deleted API key for {user_id} - {provider}")
        
        return {
            "success": True,
            "message": f"{provider} API key deleted"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete API key error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to delete API key"))

@router.post("/{user_id}/{provider}/test")
async def test_api_key(
    user_id: str,
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Test API key connection"""
    try:
        # Verify user ownership
        verify_user_ownership(current_user, user_id, "API keys")
        
        # Verify API key ownership
        api_key = await verify_api_key_ownership(current_user, provider, db)
        
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
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to test API key"))
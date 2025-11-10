import logging
import os
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from database.connection import get_db
from database import crud
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
        # Check if key already exists for this provider
        existing_key = crud.get_api_key(db, user_id, api_key_data.provider)
        
        # Encrypt the API key
        encrypted_key = encrypt_key(api_key_data.api_key)
        
        if existing_key:
            # Update existing key
            existing_key.encrypted_key = encrypted_key
            existing_key.key_preview = f"...{api_key_data.api_key[-6:]}"
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
            # Create new key
            api_key = crud.create_api_key(
                db,
                user_id=user_id,
                provider=api_key_data.provider,
                encrypted_key=encrypted_key,
                key_name=api_key_data.key_name or f"{api_key_data.provider} API Key"
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
    except ValueError as e:
        logger.error(f"Encryption error: {e}")
        raise HTTPException(status_code=500, detail="Encryption key not configured properly")
    except Exception as e:
        logger.error(f"Create API key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
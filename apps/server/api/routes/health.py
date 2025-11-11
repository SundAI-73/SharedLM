from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from database import crud
from models.schemas import HealthResponse, ModelsResponse
from typing import Optional

router = APIRouter()

@router.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "SharedLM API",
        "version": "1.0.0",
        "status": "running",
        "documentation": "/docs"
    }

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="ok")

@router.get("/models", response_model=ModelsResponse)
async def get_models(
    user_id: Optional[str] = Query(None, description="User ID to get available models for"),
    db: Session = Depends(get_db)
):
    """Get available models - returns user's connected providers if user_id provided"""
    if user_id:
        # Get user's API keys from database
        api_keys = crud.get_user_api_keys(db, user_id)
        # Only return providers where user has active API keys
        available_models = [key.provider for key in api_keys if key.is_active]
        # Also include custom integrations
        try:
            custom_integrations = crud.get_user_custom_integrations(db, user_id)
            custom_providers = [int.provider_id for int in custom_integrations if int.is_active]
            available_models.extend(custom_providers)
        except Exception as e:
            # If custom integrations query fails, just continue with API keys
            pass
        # Remove duplicates and return
        return ModelsResponse(available_models=list(set(available_models)))
    else:
        # No user_id provided - return all possible providers (for backwards compatibility)
        return ModelsResponse(
            available_models=["mistral", "openai", "anthropic", "inception"]
        )
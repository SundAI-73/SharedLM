# apps/server/api/routes/custom_integrations.py

import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from database.connection import get_db
from database import crud
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/custom-integrations", tags=["custom_integrations"])


class CustomIntegrationCreate(BaseModel):
    name: str
    base_url: Optional[str] = None
    api_type: Optional[str] = "openai"
    logo_url: Optional[str] = None


class CustomIntegrationResponse(BaseModel):
    id: int
    name: str
    provider_id: str
    base_url: Optional[str] = None
    api_type: str
    logo_url: Optional[str] = None
    is_active: bool
    created_at: str
    updated_at: str


@router.get("/{user_id}", response_model=List[CustomIntegrationResponse])
async def get_custom_integrations(user_id: str, db: Session = Depends(get_db)):
    try:
        integrations = crud.get_user_custom_integrations(db, user_id)
        return [
            CustomIntegrationResponse(
                id=integration.id,
                name=integration.name,
                provider_id=integration.provider_id,
                base_url=integration.base_url,
                api_type=integration.api_type or "openai",
                logo_url=integration.logo_url,
                is_active=integration.is_active,
                created_at=str(integration.created_at),
                updated_at=str(integration.updated_at)
            )
            for integration in integrations
        ]
    except Exception as e:
        logger.error(f"Get custom integrations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{user_id}")
async def create_custom_integration(
    user_id: str,
    integration_data: CustomIntegrationCreate,
    db: Session = Depends(get_db)
):
    try:
        provider_id = f"custom_{integration_data.name.lower().replace(' ', '_')}"
        
        integration = crud.create_custom_integration(
            db,
            user_id=user_id,
            name=integration_data.name,
            provider_id=provider_id,
            base_url=integration_data.base_url,
            api_type=integration_data.api_type or "openai",
            logo_url=integration_data.logo_url
        )
        
        logger.info(f"Created custom integration for user {user_id}: {integration_data.name}")
        
        return {
            "success": True,
            "message": "Custom integration created successfully",
            "integration": CustomIntegrationResponse(
                id=integration.id,
                name=integration.name,
                provider_id=integration.provider_id,
                base_url=integration.base_url,
                api_type=integration.api_type or "openai",
                logo_url=integration.logo_url,
                is_active=integration.is_active,
                created_at=str(integration.created_at),
                updated_at=str(integration.updated_at)
            )
        }
    except Exception as e:
        logger.error(f"Create custom integration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{integration_id}")
async def delete_custom_integration(integration_id: int, db: Session = Depends(get_db)):
    try:
        integration = crud.get_custom_integration(db, integration_id)
        
        if not integration:
            raise HTTPException(status_code=404, detail="Custom integration not found")
        
        success = crud.delete_custom_integration(db, integration_id)
        
        if success:
            logger.info(f"Deleted custom integration: {integration_id}")
            return {
                "success": True,
                "message": "Custom integration deleted successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete custom integration")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete custom integration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
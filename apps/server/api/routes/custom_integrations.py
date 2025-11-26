# apps/server/api/routes/custom_integrations.py

import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from database.connection import get_db
from database import crud
from database.models import User
from api.dependencies import get_current_user, verify_user_ownership, verify_integration_ownership
from utils.security import validate_name, validate_url, sanitize_error_message
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


@router.patch("/update/{integration_id}")
async def update_custom_integration(
    integration_id: int,
    integration_data: CustomIntegrationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify integration ownership
        integration = await verify_integration_ownership(current_user, integration_id, db)
        
        # Validate inputs
        validated_name = validate_name(integration_data.name, "Integration name")
        
        validated_base_url = None
        if integration_data.base_url:
            validated_base_url = validate_url(integration_data.base_url, "Base URL")
        
        validated_logo_url = None
        if integration_data.logo_url:
            validated_logo_url = validate_url(integration_data.logo_url, "Logo URL")
        
        # Update provider_id if name changed
        update_data = {
            "name": validated_name,
            "base_url": validated_base_url,
            "logo_url": validated_logo_url,
            "api_type": integration_data.api_type or "openai"
        }
        
        # Only update provider_id if name changed
        if integration.name != validated_name:
            # Sanitize name for provider_id
            sanitized_name = validated_name.lower().replace(' ', '_')
            # Remove any invalid characters
            sanitized_name = ''.join(c for c in sanitized_name if c.isalnum() or c in ('_', '-'))
            new_provider_id = f"custom_{sanitized_name}"
            update_data["provider_id"] = new_provider_id
        
        updated_integration = crud.update_custom_integration(db, integration_id, **update_data)
        
        if updated_integration:
            logger.info(f"Updated custom integration: {integration_id}")
            return {
                "success": True,
                "message": "Custom integration updated successfully",
                "integration": CustomIntegrationResponse(
                    id=updated_integration.id,
                    name=updated_integration.name,
                    provider_id=updated_integration.provider_id,
                    base_url=updated_integration.base_url,
                    api_type=updated_integration.api_type or "openai",
                    logo_url=updated_integration.logo_url,
                    is_active=updated_integration.is_active,
                    created_at=str(updated_integration.created_at),
                    updated_at=str(updated_integration.updated_at)
                )
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to update custom integration")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update custom integration error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to update custom integration"))


@router.delete("/delete/{integration_id}")
async def delete_custom_integration(
    integration_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify integration ownership
        await verify_integration_ownership(current_user, integration_id, db)
        
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
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to delete custom integration"))


@router.get("/{user_id}", response_model=List[CustomIntegrationResponse])
async def get_custom_integrations(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify user ownership
        verify_user_ownership(current_user, user_id, "custom integrations")
        
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get custom integrations error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to retrieve custom integrations"))


@router.post("/{user_id}")
async def create_custom_integration(
    user_id: str,
    integration_data: CustomIntegrationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Verify user ownership
        verify_user_ownership(current_user, user_id, "custom integrations")
        
        # Validate inputs
        validated_name = validate_name(integration_data.name, "Integration name")
        
        validated_base_url = None
        if integration_data.base_url:
            validated_base_url = validate_url(integration_data.base_url, "Base URL")
        
        validated_logo_url = None
        if integration_data.logo_url:
            validated_logo_url = validate_url(integration_data.logo_url, "Logo URL")
        
        # Generate provider_id from validated name
        sanitized_name = validated_name.lower().replace(' ', '_')
        sanitized_name = ''.join(c for c in sanitized_name if c.isalnum() or c in ('_', '-'))
        provider_id = f"custom_{sanitized_name}"
        
        # Check if integration with this provider_id already exists
        existing = crud.get_custom_integration_by_provider_id(db, user_id, provider_id)
        if existing:
            # Return existing integration instead of creating duplicate
            logger.info(f"Custom integration '{provider_id}' already exists for user {user_id}, returning existing")
            return {
                "success": True,
                "message": "Custom integration already exists",
                "integration": CustomIntegrationResponse(
                    id=existing.id,
                    name=existing.name,
                    provider_id=existing.provider_id,
                    base_url=existing.base_url,
                    api_type=existing.api_type or "openai",
                    logo_url=existing.logo_url,
                    is_active=existing.is_active,
                    created_at=existing.created_at,
                    updated_at=existing.updated_at
                )
            }
        
        integration = crud.create_custom_integration(
            db,
            user_id=user_id,
            name=validated_name,
            provider_id=provider_id,
            base_url=validated_base_url,
            api_type=integration_data.api_type or "openai",
            logo_url=validated_logo_url
        )
        
        logger.info(f"Created custom integration for user {user_id}: {validated_name}")
        
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create custom integration error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to create custom integration"))
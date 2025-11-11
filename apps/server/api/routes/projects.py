import logging
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile  
from sqlalchemy.orm import Session
from typing import List
from database.connection import get_db
from database import crud
from database.models import User
from api.dependencies import get_current_user, verify_user_ownership, verify_project_ownership
from utils.security import validate_name, validate_file_upload, sanitize_error_message
from models.schemas import ProjectCreate, ProjectUpdate, ProjectResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("/{user_id}", response_model=List[ProjectResponse])
async def get_projects(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all projects for user"""
    try:
        # Verify user ownership
        verify_user_ownership(current_user, user_id, "projects")
        
        projects = crud.get_user_projects(db, user_id)
        return [
            ProjectResponse(
                id=p.id,
                name=p.name,
                type=p.type,
                is_starred=p.is_starred,
                created_at=str(p.created_at),
                updated_at=str(p.updated_at)
            )
            for p in projects
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get projects error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to retrieve projects"))

@router.post("/{user_id}")
async def create_project(
    user_id: str,
    project: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new project"""
    try:
        # Verify user ownership
        verify_user_ownership(current_user, user_id, "projects")
        
        # Validate project name
        validated_name = validate_name(project.name, "Project name")
        
        new_project = crud.create_project(db, user_id, validated_name, project.type)
        return {
            "success": True,
            "project": {
                "id": new_project.id,
                "name": new_project.name,
                "type": new_project.type
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create project error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to create project"))

@router.patch("/{project_id}")
async def update_project(
    project_id: int,
    updates: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update project"""
    try:
        # Verify project ownership
        await verify_project_ownership(current_user, project_id, db)
        
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        
        # Validate name if provided
        if 'name' in update_data and update_data['name']:
            update_data['name'] = validate_name(update_data['name'], "Project name")
        
        project = crud.update_project(db, project_id, **update_data)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return {"success": True, "project": {"id": project.id, "name": project.name}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update project error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to update project"))

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete project"""
    try:
        # Verify project ownership
        await verify_project_ownership(current_user, project_id, db)
        
        crud.delete_project(db, project_id)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete project error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to delete project"))

@router.post("/{project_id}/upload")
async def upload_project_file(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload file to project"""
    try:
        import os
        import uuid
        
        # Verify project ownership
        await verify_project_ownership(current_user, project_id, db)
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")
        
        # Read file content to get size
        content = await file.read()
        file_size = len(content)
        
        # Validate file upload
        validate_file_upload(file.filename, file_size, file.content_type)
        
        # Create uploads directory
        upload_dir = "uploads/projects"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Store in database
        project_file = crud.create_project_file(
            db,
            project_id=project_id,
            filename=file.filename,
            file_size=file_size,
            storage_url=file_path
        )
        
        return {
            "success": True,
            "file": {
                "id": project_file.id,
                "filename": file.filename,
                "size": file_size
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Project file upload error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to upload file"))

@router.get("/{project_id}/files")
async def get_project_files(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all files for a project"""
    try:
        # Verify project ownership
        await verify_project_ownership(current_user, project_id, db)
        
        files = crud.get_project_files(db, project_id)
        return [
            {
                "id": f.id,
                "filename": f.filename,
                "file_size": f.file_size,
                "uploaded_at": str(f.uploaded_at)
            }
            for f in files
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get project files error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to retrieve files"))

@router.delete("/files/{file_id}")
async def delete_project_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete project file"""
    try:
        # Get file and verify project ownership
        from database.models import ProjectFile
        file_obj = db.query(ProjectFile).filter(ProjectFile.id == file_id).first()
        if not file_obj:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Verify project ownership
        await verify_project_ownership(current_user, file_obj.project_id, db)
        
        crud.delete_project_file(db, file_id)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete project file error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to delete file"))
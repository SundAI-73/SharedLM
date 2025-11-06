import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from database.connection import get_db
from database import crud
from models.schemas import ProjectCreate, ProjectUpdate, ProjectResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["projects"])

@router.get("/{user_id}", response_model=List[ProjectResponse])
async def get_projects(user_id: str, db: Session = Depends(get_db)):
    """Get all projects for user"""
    try:
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
    except Exception as e:
        logger.error(f"Get projects error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{user_id}")
async def create_project(user_id: str, project: ProjectCreate, db: Session = Depends(get_db)):
    """Create new project"""
    try:
        new_project = crud.create_project(db, user_id, project.name, project.type)
        return {
            "success": True,
            "project": {
                "id": new_project.id,
                "name": new_project.name,
                "type": new_project.type
            }
        }
    except Exception as e:
        logger.error(f"Create project error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{project_id}")
async def update_project(project_id: int, updates: ProjectUpdate, db: Session = Depends(get_db)):
    """Update project"""
    try:
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        project = crud.update_project(db, project_id, **update_data)
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return {"success": True, "project": {"id": project.id, "name": project.name}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update project error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{project_id}")
async def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Delete project"""
    try:
        crud.delete_project(db, project_id)
        return {"success": True}
    except Exception as e:
        logger.error(f"Delete project error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/{project_id}/upload")
async def upload_project_file(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload file to project"""
    try:
        import os
        import uuid
        
        # Create uploads directory
        upload_dir = "uploads/projects"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Store in database
        project_file = crud.create_project_file(
            db,
            project_id=project_id,
            filename=file.filename,
            file_size=len(content),
            storage_url=file_path
        )
        
        return {
            "success": True,
            "file": {
                "id": project_file.id,
                "filename": file.filename,
                "size": len(content)
            }
        }
    except Exception as e:
        logger.error(f"Project file upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from database.connection import get_db
from database import crud
from models.schemas import ConversationResponse, MessageResponse, ConversationUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["conversations"])

@router.get("/{user_id}", response_model=List[ConversationResponse])
async def get_conversations(user_id: str, db: Session = Depends(get_db)):
    """Get all conversations for user"""
    try:
        conversations = crud.get_user_conversations(db, user_id)
        return [
            ConversationResponse(
                id=c.id,
                title=c.title,
                model_used=c.model_used,
                message_count=c.message_count,
                project_id=c.project_id,
                created_at=str(c.created_at),
                updated_at=str(c.updated_at)
            )
            for c in conversations
        ]
    except Exception as e:
        logger.error(f"Get conversations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(conversation_id: int, db: Session = Depends(get_db)):
    """Get all messages in a conversation"""
    try:
        messages = crud.get_conversation_messages(db, conversation_id)
        return [
            MessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                model=m.model,
                created_at=str(m.created_at)
            )
            for m in messages
        ]
    except Exception as e:
        logger.error(f"Get messages error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{conversation_id}/details")
async def get_conversation_details(conversation_id: int, db: Session = Depends(get_db)):
    """Get single conversation details"""
    try:
        conversation = crud.get_conversation(db, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {
            "id": conversation.id,
            "title": conversation.title,
            "model_used": conversation.model_used,
            "message_count": conversation.message_count,
            "project_id": conversation.project_id,
            "created_at": str(conversation.created_at),
            "updated_at": str(conversation.updated_at)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get conversation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{conversation_id}/title")
async def update_conversation_title(conversation_id: int, data: dict, db: Session = Depends(get_db)):
    """Update conversation title"""
    try:
        title = data.get('title')
        if not title:
            raise HTTPException(status_code=400, detail="Title is required")
        
        conversation = crud.update_conversation_title(db, conversation_id, title)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {"success": True, "title": conversation.title}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update title error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{conversation_id}")
async def update_conversation(conversation_id: int, updates: ConversationUpdate, db: Session = Depends(get_db)):
    """Update conversation (project assignment, starred, etc)"""
    try:
        conversation = crud.get_conversation(db, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        update_data = updates.dict(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(conversation, key):
                setattr(conversation, key, value)
        
        conversation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(conversation)
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update conversation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{conversation_id}/star")
async def toggle_star_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """Toggle star status of conversation"""
    try:
        conversation = crud.get_conversation(db, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Toggle starred status (add is_starred field to model if needed)
        new_starred = not getattr(conversation, 'is_starred', False)
        if hasattr(conversation, 'is_starred'):
            conversation.is_starred = new_starred
        
        conversation.updated_at = datetime.utcnow()
        db.commit()
        
        return {"success": True, "is_starred": new_starred}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Toggle star error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """Delete conversation"""
    try:
        conversation = crud.get_conversation(db, conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        db.delete(conversation)
        db.commit()
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete conversation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/create")
async def create_conversation_endpoint(data: dict, db: Session = Depends(get_db)):
    """Create new conversation endpoint"""
    try:
        conversation = crud.create_conversation(
            db,
            user_id=data.get('user_id'),
            title=data.get('title'),
            model_used=data.get('model_used'),
            project_id=data.get('project_id')
        )
        
        return {
            "id": conversation.id,
            "title": conversation.title,
            "created_at": str(conversation.created_at)
        }
    except Exception as e:
        logger.error(f"Create conversation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
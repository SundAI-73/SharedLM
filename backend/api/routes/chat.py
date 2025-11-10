import logging
import os
import uuid
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from sqlalchemy.orm import Session
from database.connection import get_db
from database import crud
from models.schemas import ChatRequest, ChatResponse
from services.mem0_client import mem0_client
from services.llm_router import route_chat
from utils.prompt import compose_prompt

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Main chat endpoint with database integration"""
    try:
        # 1. Get or create conversation
        conversation = None
        if request.session_id:
            conversation = crud.get_conversation(db, int(request.session_id))
        
        if not conversation:
            conversation = crud.create_conversation(
                db,
                user_id=request.user_id,
                model_used=request.model_choice,
                project_id=request.project_id  
            )
        
        # 2. Save user message to database
        crud.create_message(
            db,
            conversation_id=conversation.id,
            role="user",
            content=request.message
        )
        
        # 3. Search memories (Mem0)
        memories = mem0_client.search_memories(
            user_id=request.user_id,
            query=request.message,
        )
        
        # 4. Compose prompt with memories
        prompt = compose_prompt(memories, request.message)
        
        # 5. Route to LLM
        reply, used_model = await route_chat(
            model_provider=request.model_provider,
            model_choice=request.model_choice,
            prompt=prompt
        )
        
        # 6. Save assistant message to database
        crud.create_message(
            db,
            conversation_id=conversation.id,
            role="assistant",
            content=reply,
            model=used_model
        )
        
        # 7. Update conversation title if first message
        if conversation.message_count == 2:
            title = request.message[:50] + "..." if len(request.message) > 50 else request.message
            crud.update_conversation_title(db, conversation.id, title)
        
        # 8. Store in Mem0
        mem0_client.add_memory(
            user_id=request.user_id,
            messages=[
                {"role": "user", "content": request.message},
                {"role": "assistant", "content": reply}
            ]
        )
        
        # 9. Return response with conversation_id for new conversations
        return ChatResponse(
            reply=reply,
            used_model=used_model,
            memories=memories,
            conversation_id=conversation.id
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = None,
    conversation_id: int = None,
    db: Session = Depends(get_db)
):
    """Upload file for chat context"""
    try:
        # Create uploads directory
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        logger.info(f"File uploaded: {file.filename} -> {unique_filename}")
        
        
        return {
            "success": True,
            "file": {
                "filename": file.filename,
                "stored_name": unique_filename,
                "size": len(content),
                "content_type": file.content_type,
                "path": file_path
            }
        }
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Main chat endpoint with database integration"""
    try:
        # 1. Get or create conversation
        conversation = None
        if request.session_id:
            conversation = crud.get_conversation(db, int(request.session_id))
        
        if not conversation:
            conversation = crud.create_conversation(
                db,
                user_id=request.user_id,
                model_used=request.model_choice,
                project_id=request.project_id
            )
        
        # 2. Save user message to database
        crud.create_message(
            db,
            conversation_id=conversation.id,
            role="user",
            content=request.message
        )
        
        # 3. Search memories (Mem0)
        memories = mem0_client.search_memories(
            user_id=request.user_id,
            query=request.message,
        )
        
        # 4. Compose prompt with memories
        prompt = compose_prompt(memories, request.message)
        
        # 5. Route to LLM - PASS DB SESSION
        reply, used_model = await route_chat(
            model_provider=request.model_provider,
            model_choice=request.model_choice,
            prompt=prompt,
            user_id=request.user_id,  # Add user_id
            db=db  # Add db session
        )
        
        # 6. Save assistant message to database
        crud.create_message(
            db,
            conversation_id=conversation.id,
            role="assistant",
            content=reply,
            model=used_model
        )
        
        # 7. Update conversation title if first message
        if conversation.message_count == 2:
            title = request.message[:50] + "..." if len(request.message) > 50 else request.message
            crud.update_conversation_title(db, conversation.id, title)
        
        # 8. Store in Mem0
        mem0_client.add_memory(
            user_id=request.user_id,
            messages=[
                {"role": "user", "content": request.message},
                {"role": "assistant", "content": reply}
            ]
        )
        
        # 9. Return response with conversation_id for new conversations
        return ChatResponse(
            reply=reply,
            used_model=used_model,
            memories=memories,
            conversation_id=conversation.id
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
import logging
import os
import uuid
import asyncio
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, BackgroundTasks, Form
from sqlalchemy.orm import Session
from database.connection import get_db
from database import crud
from database.models import User, Message, Conversation
from api.dependencies import get_current_user, verify_user_ownership
from models.schemas import ChatRequest, ChatResponse
from services.mem0_client import mem0_client
from services.llm_router import route_chat
from utils.prompt import compose_prompt
from utils.encryption import decrypt_key
from utils.security import validate_file_upload, sanitize_error_message, validate_message
from utils.cache import get_cached_api_key, set_cached_api_key, clear_api_key_cache
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])

# Valid Mistral models (free tier)
VALID_MISTRAL_MODELS = [
    'mistral-small-latest',
    'mistral-medium-latest', 
    'open-mistral-7b',
    'open-mixtral-8x7b'
]

def _add_memory_background(user_id: str, user_message: str, assistant_message: str):
    """Background task to add memory to Mem0 (non-blocking)"""
    try:
        mem0_client.add_memory(
            user_id=user_id,
            messages=[
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": assistant_message}
            ]
        )
    except Exception as e:
        logger.error(f"Failed to add memory in background: {e}")


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Main chat endpoint with database integration - optimized for performance"""
    try:
        # Verify user ownership
        verify_user_ownership(current_user, request.user_id, "chat")
        
        # Validate message
        validated_message = validate_message(request.message)
        
        # Log incoming request for debugging (without sensitive data)
        logger.info(f"Chat request received: user_id={request.user_id}, provider={request.model_provider}, model={request.model_choice}, session_id={request.session_id}, project_id={request.project_id}")
        
        # Validate model_choice is not empty
        if not request.model_choice or not request.model_choice.strip():
            logger.error(f"Empty model_choice received for provider {request.model_provider}")
            raise HTTPException(
                status_code=400,
                detail="Model choice is required"
            )
        
        # 1. Get or create conversation (optimized: single query)
        conversation = None
        if request.session_id:
            conversation = crud.get_conversation(db, int(request.session_id))
            if conversation and conversation.user_id != request.user_id:
                raise HTTPException(status_code=403, detail="You don't have permission to access this conversation")
        
        if not conversation:
            conversation = crud.create_conversation(
                db,
                user_id=request.user_id,
                model_used=request.model_choice,
                project_id=request.project_id  
            )
        
        # 2. Start memory search early (external API call, can run in parallel)
        # This runs concurrently while we do database operations
        memories_task = asyncio.create_task(asyncio.to_thread(
            mem0_client.search_memories,
            request.user_id,
            validated_message
        ))
        
        # 3. Fetch API key and custom integration (database operations, sequential)
        custom_integration = None
        if request.model_provider and request.model_provider.startswith("custom_"):
            custom_integration = crud.get_custom_integration_by_provider_id(db, request.user_id, request.model_provider)
            if not custom_integration:
                raise HTTPException(
                    status_code=404,
                    detail=f"Custom integration '{request.model_provider}' not found"
                )
            logger.info(f"Using custom integration: {custom_integration.name} (provider_id: {request.model_provider})")
        
        # Check cache first to avoid database query and decryption
        api_key = get_cached_api_key(request.user_id, request.model_provider)
        
        if not api_key:
            # Cache miss - fetch from database and decrypt
            api_key_obj = crud.get_api_key(db, request.user_id, request.model_provider)
            if api_key_obj:
                try:
                    api_key = decrypt_key(api_key_obj.encrypted_key)
                    # Cache the decrypted key for future requests
                    set_cached_api_key(request.user_id, request.model_provider, api_key)
                    logger.info(f"API key found and cached for user {request.user_id}, provider {request.model_provider}")
                except Exception as e:
                    logger.warning(f"Failed to decrypt API key for {request.model_provider}: {e}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to decrypt API key for {request.model_provider}. Please update your API key in Settings."
                    )
            else:
                logger.warning(f"No API key found in database for user {request.user_id}, provider {request.model_provider}")
                raise HTTPException(
                    status_code=400,
                    detail=f"No API key found for {request.model_provider}. Please add your API key in Settings."
                )
        else:
            logger.debug(f"API key retrieved from cache for user {request.user_id}, provider {request.model_provider}")
        
        # Wait for memory search to complete (may already be done by now)
        memories = await memories_task
        
        # 4. Save user message to database (before LLM call to ensure it's saved)
        user_message_obj = Message(
            conversation_id=conversation.id,
            role="user",
            content=validated_message
        )
        db.add(user_message_obj)
        
        # Update conversation in same transaction
        conversation.message_count += 1
        conversation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user_message_obj)
        
        # 5. Compose prompt with memories
        prompt = compose_prompt(memories, validated_message)
        
        # 6. Validate model choice for Mistral (skip for custom integrations)
        if request.model_provider == "mistral" and not custom_integration:
            if request.model_choice not in VALID_MISTRAL_MODELS:
                logger.warning(f"Invalid Mistral model: {request.model_choice}. Valid models: {VALID_MISTRAL_MODELS}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid model '{request.model_choice}'. Available Mistral models: {', '.join(VALID_MISTRAL_MODELS)}"
                )
            logger.info(f"Using Mistral model: {request.model_choice}")
        
        # 7. Route to LLM with user's API key (this is the slowest operation)
        try:
            if custom_integration:
                reply, used_model = await route_chat(
                    model_provider=request.model_provider,
                    model_choice=request.model_choice,
                    prompt=prompt,
                    api_key=api_key,
                    custom_integration=custom_integration
                )
            else:
                reply, used_model = await route_chat(
                    model_provider=request.model_provider,
                    model_choice=request.model_choice,
                    prompt=prompt,
                    api_key=api_key
                )
        except ValueError as e:
            error_msg = str(e)
            if "API key not provided" in error_msg or "not set" in error_msg:
                raise HTTPException(
                    status_code=400, 
                    detail=f"API key for {request.model_provider} is required. Please add it in Settings."
                )
            raise
        except Exception as e:
            model_name = custom_integration.name if custom_integration else request.model_choice
            logger.error(f"LLM API error for {request.model_provider} ({model_name}): {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error calling {request.model_provider} API ({model_name}): {str(e)}"
            )
        
        # 8. Save assistant message and update conversation in single transaction
        assistant_message_obj = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=reply,
            model=used_model
        )
        db.add(assistant_message_obj)
        conversation.message_count += 1
        conversation.updated_at = datetime.utcnow()
        conversation.model_used = used_model
        
        # Update conversation title if first message (message_count == 2 means 1 user + 1 assistant)
        if conversation.message_count == 2:
            title = validated_message[:50] + "..." if len(validated_message) > 50 else validated_message
            conversation.title = title
        
        # Commit all database changes at once
        db.commit()
        db.refresh(assistant_message_obj)
        
        # 9. Add memory to Mem0 in background (non-blocking, fire and forget)
        # This doesn't block the response to the user
        background_tasks.add_task(
            _add_memory_background,
            request.user_id,
            validated_message,
            reply
        )
        
        # 10. Return response immediately (memory addition happens in background)
        return ChatResponse(
            reply=reply,
            used_model=used_model,
            memories=memories,
            conversation_id=conversation.id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Connection issue. Please check settings or try again."))


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Form(None),
    conversation_id: int = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload file for chat context"""
    try:
        # Verify user ownership if user_id provided
        if user_id:
            verify_user_ownership(current_user, user_id, "files")
        
        # Validate file - check filename first before reading
        if not file.filename or not file.filename.strip():
            raise HTTPException(status_code=400, detail="Filename is required")
        
        # Read file content to get size
        content = await file.read()
        file_size = len(content)
        
        # Validate file upload
        validate_file_upload(file.filename, file_size, file.content_type)
        
        # Create uploads directory
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        logger.info(f"File uploaded: {file.filename} -> {unique_filename}")
        
        return {
            "success": True,
            "file": {
                "filename": file.filename,
                "stored_name": unique_filename,
                "size": file_size,
                "content_type": file.content_type,
                "path": file_path
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to upload file"))
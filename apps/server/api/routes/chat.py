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
from utils.encryption import decrypt_key

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])

# Valid Mistral models (free tier)
VALID_MISTRAL_MODELS = [
    'mistral-small-latest',
    'mistral-medium-latest', 
    'open-mistral-7b',
    'open-mixtral-8x7b'
]

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Main chat endpoint with database integration"""
    try:
        # Log incoming request for debugging
        logger.info(f"Chat request received: user_id={request.user_id}, provider={request.model_provider}, model={request.model_choice}, session_id={request.session_id}, project_id={request.project_id}")
        
        # Validate model_choice is not empty
        if not request.model_choice or not request.model_choice.strip():
            logger.error(f"Empty model_choice received for provider {request.model_provider}")
            raise HTTPException(
                status_code=400,
                detail="Model choice is required"
            )
        
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
        
        # 3. Check if it's a custom integration
        custom_integration = None
        if request.model_provider and request.model_provider.startswith("custom_"):
            custom_integration = crud.get_custom_integration_by_provider_id(db, request.user_id, request.model_provider)
            if not custom_integration:
                raise HTTPException(
                    status_code=404,
                    detail=f"Custom integration '{request.model_provider}' not found"
                )
            logger.info(f"Using custom integration: {custom_integration.name} (provider_id: {request.model_provider})")
        
        # 4. Get user's API key for the model provider
        api_key_obj = crud.get_api_key(db, request.user_id, request.model_provider)
        api_key = None
        if api_key_obj:
            try:
                api_key = decrypt_key(api_key_obj.encrypted_key)
            except Exception as e:
                logger.warning(f"Failed to decrypt API key for {request.model_provider}: {e}")
        
        # 5. Search memories (Mem0)
        memories = mem0_client.search_memories(
            user_id=request.user_id,
            query=request.message,
        )
        
        # 6. Compose prompt with memories
        prompt = compose_prompt(memories, request.message)
        
        # 7. Validate model choice for Mistral (skip for custom integrations)
        if request.model_provider == "mistral" and not custom_integration:
            if request.model_choice not in VALID_MISTRAL_MODELS:
                logger.warning(f"Invalid Mistral model: {request.model_choice}. Valid models: {VALID_MISTRAL_MODELS}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid model '{request.model_choice}'. Available Mistral models: {', '.join(VALID_MISTRAL_MODELS)}"
                )
            logger.info(f"Using Mistral model: {request.model_choice}")
        
        # 8. Route to LLM with user's API key
        try:
            if custom_integration:
                # Route to custom integration
                reply, used_model = await route_chat(
                    model_provider=request.model_provider,
                    model_choice=request.model_choice,
                    prompt=prompt,
                    api_key=api_key,
                    custom_integration=custom_integration
                )
            else:
                # Route to standard providers
                reply, used_model = await route_chat(
                    model_provider=request.model_provider,
                    model_choice=request.model_choice,
                    prompt=prompt,
                    api_key=api_key
                )
        except ValueError as e:
            # API key missing error
            error_msg = str(e)
            if "API key not provided" in error_msg or "not set" in error_msg:
                raise HTTPException(
                    status_code=400, 
                    detail=f"API key for {request.model_provider} is required. Please add it in Settings."
                )
            raise
        except Exception as e:
            # Other API errors - include model information in error
            model_name = custom_integration.name if custom_integration else request.model_choice
            logger.error(f"LLM API error for {request.model_provider} ({model_name}): {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error calling {request.model_provider} API ({model_name}): {str(e)}"
            )
        
        # 8. Save assistant message to database
        crud.create_message(
            db,
            conversation_id=conversation.id,
            role="assistant",
            content=reply,
            model=used_model
        )
        
        # 9. Update conversation title if first message
        if conversation.message_count == 2:
            title = request.message[:50] + "..." if len(request.message) > 50 else request.message
            crud.update_conversation_title(db, conversation.id, title)
        
        # 10. Store in Mem0
        mem0_client.add_memory(
            user_id=request.user_id,
            messages=[
                {"role": "user", "content": request.message},
                {"role": "assistant", "content": reply}
            ]
        )
        
        # 11. Return response with conversation_id for new conversations
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
        raise HTTPException(status_code=500, detail=f"Connection issue. Please check settings or try again. Error: {str(e)}")


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
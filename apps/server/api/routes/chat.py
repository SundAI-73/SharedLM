import json
import logging
import os
import time
import uuid
import asyncio
from dataclasses import dataclass, field
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Form, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database.connection import get_db
from database import crud
from database.models import User, Message, Conversation, CustomIntegration
from api.dependencies import get_current_user, verify_user_ownership
from models.schemas import ChatRequest, ChatResponse
from services.mem0_client import mem0_client
from services.llm_router import route_chat, route_chat_stream
from utils.prompt import compose_system_context
from utils.file_extractor import extract_text_from_file
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

# How many prior turns are replayed to the model on each request
HISTORY_LIMIT = 20


def _add_memory_background(user_id: str, user_message: str, assistant_message: str, project_id: int = None):
    """Background task to add memory to Mem0 (non-blocking)"""
    try:
        mem0_client.add_memory(
            user_id=user_id,
            messages=[
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": assistant_message}
            ],
            project_id=project_id
        )
    except Exception as e:
        logger.error(f"Failed to add memory in background: {e}")


@dataclass
class PreparedChat:
    """Everything the LLM call needs, assembled identically for the
    streaming and non-streaming endpoints."""
    conversation: Conversation
    custom_integration: Optional[CustomIntegration]
    is_localhost_url: bool
    api_key: Optional[str]
    memories: List[str]
    history: List[dict]
    system_context: Optional[str]
    prompt: str


async def _prepare_chat(request: ChatRequest, current_user: User, db: Session) -> PreparedChat:
    """Validate the request and assemble conversation, key, memories,
    history and file context. Raises HTTPException on any failure."""
    # Verify user ownership
    verify_user_ownership(current_user, request.user_id, "chat")

    # Validate message
    validated_message = validate_message(request.message)

    logger.info(
        f"Chat request received: user_id={request.user_id}, provider={request.model_provider}, "
        f"model={request.model_choice}, session_id={request.session_id}, "
        f"project_id={request.project_id}, regenerate={request.regenerate}"
    )

    # Validate model_choice is not empty
    if not request.model_choice or not request.model_choice.strip():
        logger.error(f"Empty model_choice received for provider {request.model_provider}")
        raise HTTPException(status_code=400, detail="Model choice is required")

    # 1. Get or create conversation
    conversation = None
    if request.session_id:
        conversation = crud.get_conversation(db, int(request.session_id))
        if conversation and conversation.user_id != request.user_id:
            raise HTTPException(status_code=403, detail="You don't have permission to access this conversation")

    if request.regenerate and not conversation:
        raise HTTPException(status_code=400, detail="Regenerate requires an existing conversation")

    if not conversation:
        conversation = crud.create_conversation(
            db,
            user_id=request.user_id,
            model_used=request.model_choice,
            project_id=request.project_id
        )

    # 2. Fetch custom integration (if any)
    custom_integration = None
    is_localhost_url = False

    if request.model_provider and request.model_provider.startswith("custom_"):
        custom_integration = crud.get_custom_integration_by_provider_id(db, request.user_id, request.model_provider)
        if not custom_integration:
            raise HTTPException(
                status_code=404,
                detail=f"Custom integration '{request.model_provider}' not found"
            )
        logger.info(f"Using custom integration: {custom_integration.name} (provider_id: {request.model_provider})")

        # Check if this is a localhost URL and we're on cloud - reject it
        # Non-localhost custom URLs (user's own server) are allowed through backend
        is_cloud = os.getenv("RENDER") or os.getenv("DYNO") or os.getenv("VERCEL") or os.getenv("RAILWAY_ENVIRONMENT")
        if custom_integration.base_url:
            is_localhost_url = any(
                localhost in custom_integration.base_url.lower()
                for localhost in ["localhost", "127.0.0.1", "0.0.0.0"]
            )
            if is_localhost_url and is_cloud:
                raise HTTPException(
                    status_code=400,
                    detail="Localhost LLMs cannot be used on cloud server. Please use the desktop application for localhost LLM support."
                )

    # 3. Start memory search early (external API call, runs while we hit the DB)
    if not is_localhost_url:
        memories_task = asyncio.create_task(asyncio.to_thread(
            mem0_client.search_memories,
            request.user_id,
            validated_message
        ))
    else:
        memories_task = asyncio.create_task(asyncio.to_thread(lambda: []))

    # 4. Resolve API key (cache -> database)
    api_key = get_cached_api_key(request.user_id, request.model_provider)

    if custom_integration and custom_integration.base_url:
        # Custom integration with base_url - API key is optional (can use placeholder)
        if not api_key:
            api_key_obj = crud.get_api_key(db, request.user_id, request.model_provider)
            if api_key_obj:
                try:
                    api_key = decrypt_key(api_key_obj.encrypted_key)
                    set_cached_api_key(request.user_id, request.model_provider, api_key)
                    logger.info(f"API key found and cached for user {request.user_id}, provider {request.model_provider}")
                except Exception as e:
                    logger.warning(f"Failed to decrypt API key for {request.model_provider}: {e}")
                    api_key = "ollama"  # Placeholder for Ollama or similar services
            else:
                # No API key found, but base_url exists - use placeholder
                api_key = "ollama"
    else:
        # Standard providers or custom integrations without base_url - API key is required
        if not api_key:
            api_key_obj = crud.get_api_key(db, request.user_id, request.model_provider)
            if api_key_obj:
                try:
                    api_key = decrypt_key(api_key_obj.encrypted_key)
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

    # 5. Validate model choice for Mistral (skip for custom integrations)
    if request.model_provider == "mistral" and not custom_integration:
        if request.model_choice not in VALID_MISTRAL_MODELS:
            logger.warning(f"Invalid Mistral model: {request.model_choice}. Valid models: {VALID_MISTRAL_MODELS}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model '{request.model_choice}'. Available Mistral models: {', '.join(VALID_MISTRAL_MODELS)}"
            )

    # 6. Build conversation history and persist the user turn
    prior_messages = crud.get_conversation_messages(db, conversation.id)

    prompt = validated_message
    if request.regenerate:
        # Replace the last assistant reply: drop trailing assistant messages,
        # reuse the last stored user turn as the prompt, save nothing new.
        while prior_messages and prior_messages[-1].role == "assistant":
            stale = prior_messages.pop()
            db.delete(stale)
            conversation.message_count = max(0, (conversation.message_count or 0) - 1)
        if prior_messages and prior_messages[-1].role == "user":
            prompt = prior_messages[-1].content
            prior_messages = prior_messages[:-1]
        db.commit()
    else:
        user_message_obj = Message(
            conversation_id=conversation.id,
            role="user",
            content=validated_message
        )
        db.add(user_message_obj)
        conversation.message_count += 1
        conversation.updated_at = datetime.utcnow()
        db.commit()

    history = [
        {"role": m.role, "content": m.content}
        for m in prior_messages[-HISTORY_LIMIT:]
    ]

    # 7. Extract content from project files (if project_id exists)
    project_files_content = []
    if conversation.project_id:
        project_files = crud.get_project_files(db, conversation.project_id)
        for project_file in project_files or []:
            try:
                extracted_text = extract_text_from_file(project_file.storage_path, project_file.file_type)
                if extracted_text:
                    project_files_content.append({
                        "filename": project_file.filename,
                        "content": extracted_text
                    })
            except Exception as e:
                logger.error(f"Error extracting content from project file {project_file.filename}: {e}")

    # 8. Extract content from chat attached files
    chat_files_content = []
    chat_files = crud.get_chat_files(db, conversation.id)
    for chat_file in chat_files or []:
        try:
            extracted_text = extract_text_from_file(chat_file.storage_path, chat_file.file_type)
            if extracted_text:
                chat_files_content.append({
                    "filename": chat_file.filename,
                    "content": extracted_text
                })
        except Exception as e:
            logger.error(f"Error extracting content from chat file {chat_file.filename}: {e}")

    # 9. Wait for memory search to complete (may already be done by now)
    memories = await memories_task

    system_context = compose_system_context(memories, project_files_content, chat_files_content)

    return PreparedChat(
        conversation=conversation,
        custom_integration=custom_integration,
        is_localhost_url=is_localhost_url,
        api_key=api_key,
        memories=memories,
        history=history,
        system_context=system_context,
        prompt=prompt
    )


def _save_assistant_message(
    db: Session,
    prepared: PreparedChat,
    reply: str,
    used_model: str,
    usage: Optional[dict],
    response_time_ms: Optional[int],
    first_user_message: str
) -> Message:
    """Persist the assistant turn and conversation bookkeeping."""
    conversation = prepared.conversation
    assistant_message_obj = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=reply,
        model=used_model,
        prompt_tokens=(usage or {}).get("prompt_tokens"),
        completion_tokens=(usage or {}).get("completion_tokens"),
        response_time_ms=response_time_ms
    )
    db.add(assistant_message_obj)
    conversation.message_count += 1
    conversation.updated_at = datetime.utcnow()
    conversation.model_used = used_model

    # Set conversation title on the first exchange (1 user + 1 assistant)
    if conversation.message_count == 2 and not conversation.title:
        title = first_user_message[:50] + "..." if len(first_user_message) > 50 else first_user_message
        conversation.title = title

    db.commit()
    db.refresh(assistant_message_obj)
    return assistant_message_obj


def _schedule_memory_add(prepared: PreparedChat, user_id: str, prompt: str, reply: str):
    """Store the exchange in Mem0 without blocking the response."""
    if prepared.is_localhost_url:
        return  # localhost LLMs store memory client-side
    asyncio.create_task(asyncio.to_thread(
        _add_memory_background, user_id, prompt, reply, prepared.conversation.project_id
    ))


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Main chat endpoint with database integration - optimized for performance"""
    try:
        prepared = await _prepare_chat(request, current_user, db)

        started = time.monotonic()
        try:
            reply, used_model = await route_chat(
                model_provider=request.model_provider,
                model_choice=request.model_choice,
                prompt=prepared.prompt,
                api_key=prepared.api_key,
                custom_integration=prepared.custom_integration,
                history=prepared.history,
                system=prepared.system_context,
                max_tokens=request.max_tokens
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
            model_name = prepared.custom_integration.name if prepared.custom_integration else request.model_choice
            logger.error(f"LLM API error for {request.model_provider} ({model_name}): {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Error calling {request.model_provider} API ({model_name}): {str(e)}"
            )

        response_time_ms = int((time.monotonic() - started) * 1000)
        _save_assistant_message(db, prepared, reply, used_model, None, response_time_ms, prepared.prompt)

        if not prepared.is_localhost_url:
            background_tasks.add_task(
                _add_memory_background,
                request.user_id,
                prepared.prompt,
                reply,
                prepared.conversation.project_id
            )

        return ChatResponse(
            reply=reply,
            used_model=used_model,
            memories=prepared.memories,
            conversation_id=prepared.conversation.id,
            response_time_ms=response_time_ms
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Connection issue. Please check settings or try again."))


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


@router.post("/chat/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Streaming chat endpoint (Server-Sent Events).

    Event payloads:
      {"type": "meta", "conversation_id": int, "memories": [...]}
      {"type": "delta", "text": str}
      {"type": "done", "used_model": str, "usage": {...}|null, "response_time_ms": int}
      {"type": "error", "detail": str}
    """
    # Preparation errors surface as normal HTTP errors before the stream starts
    prepared = await _prepare_chat(request, current_user, db)

    async def event_stream():
        reply_parts: List[str] = []
        usage = None
        used_model = (
            prepared.custom_integration.name
            if prepared.custom_integration else request.model_choice
        )
        started = time.monotonic()

        def persist(final: bool):
            reply = "".join(reply_parts)
            if not reply:
                return
            response_time_ms = int((time.monotonic() - started) * 1000)
            _save_assistant_message(
                db, prepared, reply, used_model,
                usage if final else None, response_time_ms, prepared.prompt
            )
            _schedule_memory_add(prepared, request.user_id, prepared.prompt, reply)

        yield _sse({
            "type": "meta",
            "conversation_id": prepared.conversation.id,
            "memories": prepared.memories
        })

        try:
            async for event in route_chat_stream(
                model_provider=request.model_provider,
                model_choice=request.model_choice,
                prompt=prepared.prompt,
                api_key=prepared.api_key,
                custom_integration=prepared.custom_integration,
                history=prepared.history,
                system=prepared.system_context,
                max_tokens=request.max_tokens
            ):
                if event["type"] == "delta":
                    reply_parts.append(event["text"])
                    yield _sse({"type": "delta", "text": event["text"]})
                elif event["type"] == "done":
                    usage = event.get("usage")
        except (asyncio.CancelledError, GeneratorExit):
            # Client disconnected (stop button / closed tab): keep the partial reply
            logger.info(f"Stream cancelled by client for conversation {prepared.conversation.id}")
            persist(final=False)
            raise
        except Exception as e:
            logger.error(f"Streaming LLM error for {request.model_provider}: {e}")
            yield _sse({
                "type": "error",
                "detail": f"Error calling {request.model_provider} API ({used_model}): {str(e)}"
            })
            return

        persist(final=True)
        yield _sse({
            "type": "done",
            "used_model": used_model,
            "usage": usage,
            "response_time_ms": int((time.monotonic() - started) * 1000)
        })

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/upload")
async def upload_file(
    request: Request,
    user_id: str = Form(None),
    conversation_id: int = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload file for chat context.

    The file is pulled from the parsed form rather than declared as an
    UploadFile parameter: starlette>=1.0 delivers an empty-filename part as a
    plain string, which would 422 before reaching the endpoint. Reading it
    from the form lets us return the documented 400 "Filename is required".
    """
    try:
        # Verify user ownership if user_id provided
        if user_id:
            verify_user_ownership(current_user, user_id, "files")

        form = await request.form()
        file = form.get("file")

        # Validate file - an empty/missing filename arrives as a str (no .filename)
        if file is None or not hasattr(file, "filename") or not file.filename or not file.filename.strip():
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

        # Save file info to database if conversation_id is provided
        chat_file = None
        if conversation_id:
            # Verify conversation belongs to user
            conversation = crud.get_conversation(db, conversation_id)
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
            if conversation.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="You don't have permission to add files to this conversation")

            # Create chat file record
            chat_file = crud.create_chat_file(
                db,
                conversation_id=conversation_id,
                filename=file.filename,
                file_size=file_size,
                storage_path=file_path,
                file_type=file.content_type
            )
            logger.info(f"File uploaded and saved to database: {file.filename} -> {unique_filename} (conversation_id: {conversation_id})")
        else:
            logger.info(f"File uploaded: {file.filename} -> {unique_filename} (no conversation_id provided)")

        return {
            "success": True,
            "file": {
                "id": chat_file.id if chat_file else None,
                "filename": file.filename,
                "stored_name": unique_filename,
                "size": file_size,
                "content_type": file.content_type,
                "path": file_path,
                "conversation_id": conversation_id
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=sanitize_error_message(e, "Failed to upload file"))

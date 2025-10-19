import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models.schemas import (
    ChatRequest, ChatResponse, HealthResponse, 
    ModelsResponse, MemorySearchRequest, MemorySearchResponse
)
from app.services.mem0_client import mem0_client
from app.services.llm_router import route_chat
from app.utils.prompt import compose_prompt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="SharedLM Backend",
    description="Unified chat interface with shared memory across LLMs",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="ok")


@app.get("/models", response_model=ModelsResponse)
async def get_models():
    """Get available models and defaults"""
    return ModelsResponse(
        available_models=["openai", "anthropic"],
        default_openai=settings.default_model_openai,
        default_anthropic=settings.default_model_anthropic
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint with shared memory"""
    try:
        # 1. Search for relevant memories
        memories = mem0_client.search_memories(
            user_id=request.user_id,
            query=request.message,
            limit=settings.default_top_k
        )
        
        # 2. Compose prompt with memories
        prompt = compose_prompt(memories, request.message)
        
        # 3. Route to appropriate model
        reply, used_model = await route_chat(request.model_choice, prompt)
        
        # 4. Store the conversation in memory
        messages_to_store = [
            {"role": "user", "content": request.message},
            {"role": "assistant", "content": reply}
        ]
        
        mem0_client.add_memory(request.user_id, messages_to_store)
        
        # 5. Return response
        return ChatResponse(
            reply=reply,
            used_model=used_model,
            memories=memories
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/memory/search", response_model=MemorySearchResponse)
async def search_memories(request: MemorySearchRequest):
    """Debug endpoint to search memories"""
    try:
        memories = mem0_client.search_memories(
            user_id=request.user_id,
            query=request.query,
            limit=request.limit
        )
        
        return MemorySearchResponse(
            memories=memories,
            count=len(memories)
        )
        
    except Exception as e:
        logger.error(f"Memory search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
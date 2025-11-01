import logging
import os
import sys
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.models.schemas import (
    ChatRequest, ChatResponse, HealthResponse, 
    ModelsResponse, MemorySearchRequest, MemorySearchResponse
)
from backend.services.mem0_client import mem0_client
from backend.services.llm_router import route_chat
from backend.utils.prompt import compose_prompt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="SharedLM Backend",
    description="Unified chat interface with shared memory across LLMs",
    version="1.0.0"
)

# Configure CORS for production and development
allowed_origins = [
    # Production domains
    "https://shared-lm.vercel.app",  # Your Vercel deployment
    "https://shared-lm-*.vercel.app",  # Preview deployments
    "https://*.vercel.app",  # All Vercel preview deployments

    
    # Development
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "SharedLM API",
        "version": "1.0.0",
        "status": "running",
        "documentation": "/docs"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="ok")


@app.get("/models", response_model=ModelsResponse)
async def get_models():
    """Get available models and defaults"""
    return ModelsResponse(
        available_models=["mistral", "openai", "anthropic"],
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint with shared memory"""
    try:
        # 1. Search for relevant memories
        memories = mem0_client.search_memories(
            user_id=request.user_id,
            query=request.message,
        )
        
        # 2. Compose prompt with memories
        prompt = compose_prompt(memories, request.message)
        
        # 3. Route to appropriate model
        reply, used_model = await route_chat(request.model_provider, request.model_choice, prompt)
        
        # 4. Store the conversation in memory with enhanced context
        # Create a more descriptive memory entry
        conversation_summary = f"User asked: '{request.message[:100]}{'...' if len(request.message) > 100 else ''}' and received a response about: '{reply[:100]}{'...' if len(reply) > 100 else ''}'"
        
        messages_to_store = [
            {"role": "user", "content": request.message},
            {"role": "assistant", "content": reply}
        ]
        
        # Store both the conversation and a summary
        mem0_client.add_memory(request.user_id, messages_to_store)
        
        # Also store a summary for better retrieval
        summary_messages = [
            {"role": "user", "content": conversation_summary}
        ]
        mem0_client.add_memory(request.user_id, summary_messages)
        
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


@app.get("/memory/debug/{user_id}")
async def debug_memories(user_id: str):
    """Debug endpoint to see all memories for a user"""
    try:
        # Get all memories for debugging
        debug_results = mem0_client.search_memories_debug(
            user_id=user_id,
            query="",  # Empty query to get all memories
            limit=10
        )
        
        return {
            "user_id": user_id,
            "debug_results": debug_results,
            "message": "Check the debug_results to see what memories are stored"
        }
        
    except Exception as e:
        logger.error(f"Debug memory error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
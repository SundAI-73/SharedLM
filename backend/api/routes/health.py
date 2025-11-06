from fastapi import APIRouter
from models.schemas import HealthResponse, ModelsResponse

router = APIRouter()

@router.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "SharedLM API",
        "version": "1.0.0",
        "status": "running",
        "documentation": "/docs"
    }

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="ok")

@router.get("/models", response_model=ModelsResponse)
async def get_models():
    """Get available models and defaults"""
    return ModelsResponse(
        available_models=["mistral", "openai", "anthropic"]
    )
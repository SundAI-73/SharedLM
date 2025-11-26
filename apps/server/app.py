import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from api.routes import custom_integrations

from config.settings import settings
from database.connection import engine
from database import models

# Import route modules
from api.routes import health, auth, chat, projects, conversations, api_keys, ollama

# Create tables (skip in test environment)
import os
if os.getenv("ENVIRONMENT") != "test":
    models.Base.metadata.create_all(bind=engine)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Unified chat interface with shared memory across LLMs",
    version=settings.app_version
)

# Add validation error handler to log 422 errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Log validation errors for debugging"""
    import json
    from utils.security import sanitize_request_body
    
    body = await request.body()
    try:
        if body:
            body_dict = json.loads(body.decode())
            sanitized_body = sanitize_request_body(body_dict)
            logger.error(f"Validation error on {request.url.path}: {exc.errors()}")
            logger.error(f"Request body: {json.dumps(sanitized_body)}")
        else:
            logger.error(f"Validation error on {request.url.path}: {exc.errors()}")
    except Exception:
        # If body can't be parsed, just log the error
        logger.error(f"Validation error on {request.url.path}: {exc.errors()}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

# Configure CORS
# In production, restrict origins to specific domains
# For development, allow localhost origins
import os
env = os.getenv("ENVIRONMENT", "development")
if env == "production":
    # In production, use explicit origins from settings
    cors_origins = [origin for origin in settings.cors_origins if origin.startswith("https://")]
else:
    # In development, allow localhost and settings origins
    cors_origins = settings.cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-User-ID"],
    expose_headers=["Content-Type"],
    max_age=3600,
)

# Register routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(projects.router)
app.include_router(conversations.router)
app.include_router(api_keys.router)
app.include_router(custom_integrations.router)
app.include_router(ollama.router)

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info(f"{settings.app_name} v{settings.app_version} starting up...")
    logger.info(f"Database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'configured'}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info(f"{settings.app_name} shutting down...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level="info"
    )
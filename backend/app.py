import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import custom_integrations

from config.settings import settings
from database.connection import engine
from database import models

# Import route modules
from api.routes import health, auth, chat, projects, conversations, api_keys

# Create tables
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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(projects.router)
app.include_router(conversations.router)
app.include_router(api_keys.router)
app.include_router(custom_integrations.router)

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
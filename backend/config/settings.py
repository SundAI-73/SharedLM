import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App Info
    app_name: str = "SharedLM Backend"
    app_version: str = "1.0.0"
    
    # Database - Can use either DATABASE_URL or individual components
    database_url: str = ""
    db_host: str = "localhost"
    db_port: str = "5432"
    db_user: str = "postgres"
    db_password: str = "password"
    db_name: str = "sharedlm"
    
    # API Keys
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    mistral_api_key: str = ""
    mem0_api_key: str = ""
    
    # Model Defaults
    default_model_openai: str = "gpt-4o-mini"
    default_model_anthropic: str = "claude-3-5-sonnet-20241022"
    default_model_mistral: str = "mistral-tiny"
    default_top_k: int = 5
    
    # CORS
    cors_origins: List[str] = [
        "https://shared-lm.vercel.app",
        "https://shared-lm-*.vercel.app",
        "https://*.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "allow"  # Allow extra fields from .env
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # If DATABASE_URL not provided, build it from components
        if not self.database_url:
            self.database_url = f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

# Global settings instance
settings = Settings()
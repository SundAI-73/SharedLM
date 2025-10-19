from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Mem0 Configuration
    mem0_api_key: str
    mem0_org_id: Optional[str] = None
    mem0_project_id: Optional[str] = None
    
    # LLM API Keys
    openai_api_key: str
    anthropic_api_key: str
    
    # Configuration
    default_top_k: int = 5
    default_model_openai: str = "gpt-4o-mini"
    default_model_anthropic: str = "claude-3-5-sonnet-latest"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
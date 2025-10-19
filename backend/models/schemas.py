from pydantic import BaseModel
from typing import List, Optional, Literal


class ChatRequest(BaseModel):
    user_id: str
    message: str
    model_choice: Literal["openai", "anthropic"]
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    used_model: str
    memories: List[str]


class HealthResponse(BaseModel):
    status: str


class ModelsResponse(BaseModel):
    available_models: List[str]
    default_openai: str
    default_anthropic: str


class MemorySearchRequest(BaseModel):
    user_id: str
    query: str
    limit: Optional[int] = 5


class MemorySearchResponse(BaseModel):
    memories: List[str]
    count: int
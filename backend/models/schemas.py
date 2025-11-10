from pydantic import BaseModel
from typing import List, Optional, Literal

# CHAT SCHEMAS

class ChatRequest(BaseModel):
    user_id: str
    message: str
    model_provider: Literal["openai", "anthropic", "mistral"]
    model_choice: str
    session_id: Optional[str] = None
    project_id: Optional[int] = None  

class ChatResponse(BaseModel):
    reply: str
    used_model: str
    memories: List[str]
    conversation_id: Optional[int] = None  

# HEALTH & INFO SCHEMAS

class HealthResponse(BaseModel):
    status: str

class ModelsResponse(BaseModel):
    available_models: List[str]

# MEMORY SCHEMAS

class MemorySearchRequest(BaseModel):
    user_id: str
    query: str
    limit: Optional[int] = 5

class MemorySearchResponse(BaseModel):
    memories: List[str]
    count: int

# USER/AUTH SCHEMAS

class UserCreate(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    created_at: str

# PROJECT SCHEMAS

class ProjectCreate(BaseModel):
    name: str
    type: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    is_starred: Optional[bool] = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    type: Optional[str]
    is_starred: bool
    created_at: str
    updated_at: str

# CONVERSATION SCHEMAS

class ConversationResponse(BaseModel):
    id: int
    title: str
    model_used: Optional[str]
    message_count: int
    project_id: Optional[int]
    created_at: str
    updated_at: str

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    project_id: Optional[int] = None
    is_starred: Optional[bool] = None

# MESSAGE SCHEMAS

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    model: Optional[str]
    created_at: str

# FILE UPLOAD SCHEMAS

class FileUploadResponse(BaseModel):
    success: bool
    file: dict

# API KEY SCHEMAS

class APIKeyCreate(BaseModel):
    provider: str
    api_key: str
    key_name: Optional[str] = None

class APIKeyResponse(BaseModel):
    id: int
    provider: str
    key_name: Optional[str]
    key_preview: str
    is_active: bool
    created_at: str
    updated_at: str

class APIKeyDecrypted(BaseModel):
    provider: str
    api_key: str
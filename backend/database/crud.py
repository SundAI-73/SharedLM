from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from database.models import User, APIKey, Project, Conversation, Message, ProjectFile
import bcrypt
from datetime import datetime

# ============================================
# USER CRUD
# ============================================

def create_user(db: Session, user_id: str, email: str, password: str, display_name: str = None):
    """Create a new user with hashed password"""
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = User(
        id=user_id,
        email=email,
        password_hash=password_hash,
        display_name=display_name or email.split('@')[0]
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_email(db: Session, email: str):
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: str):
    """Get user by ID"""
    return db.query(User).filter(User.id == user_id).first()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# ============================================
# API KEY CRUD
# ============================================

def create_api_key(db: Session, user_id: str, provider: str, encrypted_key: str, key_name: str = None):
    """Create API key for user"""
    key_preview = f"...{encrypted_key[-6:]}"
    
    api_key = APIKey(
        user_id=user_id,
        provider=provider,
        key_name=key_name or f"{provider} API Key",
        encrypted_key=encrypted_key,
        key_preview=key_preview
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return api_key

def get_user_api_keys(db: Session, user_id: str):
    """Get all API keys for a user"""
    return db.query(APIKey).filter(APIKey.user_id == user_id, APIKey.is_active == True).all()

def get_api_key(db: Session, user_id: str, provider: str):
    """Get specific API key for user and provider"""
    return db.query(APIKey).filter(
        APIKey.user_id == user_id,
        APIKey.provider == provider,
        APIKey.is_active == True
    ).first()

# ============================================
# PROJECT CRUD
# ============================================

def create_project(db: Session, user_id: str, name: str, project_type: str = None):
    """Create new project"""
    project = Project(
        user_id=user_id,
        name=name,
        type=project_type
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

def get_user_projects(db: Session, user_id: str):
    """Get all projects for user"""
    return db.query(Project).filter(Project.user_id == user_id).order_by(desc(Project.updated_at)).all()

def get_starred_projects(db: Session, user_id: str):
    """Get starred projects for user"""
    return db.query(Project).filter(
        Project.user_id == user_id,
        Project.is_starred == True
    ).order_by(desc(Project.updated_at)).limit(4).all()

def update_project(db: Session, project_id: int, **kwargs):
    """Update project fields"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        for key, value in kwargs.items():
            setattr(project, key, value)
        project.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(project)
    return project

def delete_project(db: Session, project_id: int):
    """Delete project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        db.delete(project)
        db.commit()
    return True

# ============================================
# CONVERSATION CRUD
# ============================================

def create_conversation(db: Session, user_id: str, title: str = None, model_used: str = None, project_id: int = None):
    """Create new conversation"""
    conversation = Conversation(
        user_id=user_id,
        project_id=project_id,
        title=title or "New Chat",
        model_used=model_used
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation

def get_user_conversations(db: Session, user_id: str, limit: int = 50):
    """Get all conversations for user"""
    return db.query(Conversation).filter(
        Conversation.user_id == user_id
    ).order_by(desc(Conversation.updated_at)).limit(limit).all()

def get_project_conversations(db: Session, project_id: int):
    """Get conversations for a project"""
    return db.query(Conversation).filter(
        Conversation.project_id == project_id
    ).order_by(desc(Conversation.updated_at)).all()

def get_conversation(db: Session, conversation_id: int):
    """Get single conversation"""
    return db.query(Conversation).filter(Conversation.id == conversation_id).first()

def update_conversation_title(db: Session, conversation_id: int, title: str):
    """Update conversation title"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conversation:
        conversation.title = title
        conversation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(conversation)
    return conversation

# ============================================
# MESSAGE CRUD
# ============================================

def create_message(db: Session, conversation_id: int, role: str, content: str, model: str = None):
    """Create new message and update conversation"""
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        model=model
    )
    db.add(message)
    
    # Update conversation
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conversation:
        conversation.message_count += 1
        conversation.updated_at = datetime.utcnow()
        if model:
            conversation.model_used = model
    
    db.commit()
    db.refresh(message)
    return message

def get_conversation_messages(db: Session, conversation_id: int):
    """Get all messages for a conversation"""
    return db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at).all()

# ============================================
# PROJECT FILE CRUD
# ============================================

def create_project_file(db: Session, project_id: int, filename: str, file_size: int, storage_url: str):
    """Create project file reference"""
    file = ProjectFile(
        project_id=project_id,
        filename=filename,
        file_size=file_size,
        storage_url=storage_url
    )
    db.add(file)
    db.commit()
    db.refresh(file)
    return file

def get_project_files(db: Session, project_id: int):
    """Get all files for a project"""
    return db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()

def delete_project_file(db: Session, file_id: int):
    """Delete project file"""
    file = db.query(ProjectFile).filter(ProjectFile.id == file_id).first()
    if file:
        db.delete(file)
        db.commit()
    return True
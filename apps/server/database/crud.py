from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from database.models import User, APIKey, Project, Conversation, Message, ProjectFile, CustomIntegration
import bcrypt
from datetime import datetime

def create_user(db: Session, user_id: str, email: str, password: str, display_name: str = None):
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
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: str):
    return db.query(User).filter(User.id == user_id).first()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_api_key(db: Session, user_id: str, provider: str, encrypted_key: str, key_name: str = None):
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
    return db.query(APIKey).filter(APIKey.user_id == user_id, APIKey.is_active == True).all()

def get_api_key(db: Session, user_id: str, provider: str):
    return db.query(APIKey).filter(
        APIKey.user_id == user_id,
        APIKey.provider == provider,
        APIKey.is_active == True
    ).first()

def create_custom_integration(
    db: Session,
    user_id: str,
    name: str,
    provider_id: str,
    base_url: str = None,
    api_type: str = "openai",
    logo_url: str = None
):
    integration = CustomIntegration(
        user_id=user_id,
        name=name,
        provider_id=provider_id,
        base_url=base_url,
        api_type=api_type,
        logo_url=logo_url
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)
    return integration

def get_user_custom_integrations(db: Session, user_id: str):
    return db.query(CustomIntegration).filter(
        CustomIntegration.user_id == user_id,
        CustomIntegration.is_active == True
    ).order_by(desc(CustomIntegration.created_at)).all()

def get_custom_integration(db: Session, integration_id: int):
    return db.query(CustomIntegration).filter(
        CustomIntegration.id == integration_id
    ).first()

def get_custom_integration_by_provider_id(db: Session, user_id: str, provider_id: str):
    return db.query(CustomIntegration).filter(
        CustomIntegration.user_id == user_id,
        CustomIntegration.provider_id == provider_id,
        CustomIntegration.is_active == True
    ).first()

def update_custom_integration(db: Session, integration_id: int, **kwargs):
    integration = db.query(CustomIntegration).filter(
        CustomIntegration.id == integration_id
    ).first()
    
    if integration:
        for key, value in kwargs.items():
            if hasattr(integration, key):
                setattr(integration, key, value)
        integration.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(integration)
    
    return integration

def delete_custom_integration(db: Session, integration_id: int):
    integration = db.query(CustomIntegration).filter(
        CustomIntegration.id == integration_id
    ).first()
    
    if integration:
        db.delete(integration)
        db.commit()
        return True
    return False

def create_project(db: Session, user_id: str, name: str, project_type: str = None):
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
    return db.query(Project).filter(Project.user_id == user_id).order_by(desc(Project.updated_at)).all()

def get_starred_projects(db: Session, user_id: str):
    return db.query(Project).filter(
        Project.user_id == user_id,
        Project.is_starred == True
    ).order_by(desc(Project.updated_at)).limit(4).all()

def update_project(db: Session, project_id: int, **kwargs):
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        for key, value in kwargs.items():
            setattr(project, key, value)
        project.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(project)
    return project

def delete_project(db: Session, project_id: int):
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        db.delete(project)
        db.commit()
    return True

def create_conversation(db: Session, user_id: str, title: str = None, model_used: str = None, project_id: int = None):
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
    return db.query(Conversation).filter(
        Conversation.user_id == user_id
    ).order_by(desc(Conversation.updated_at)).limit(limit).all()

def get_project_conversations(db: Session, project_id: int):
    return db.query(Conversation).filter(
        Conversation.project_id == project_id
    ).order_by(desc(Conversation.updated_at)).all()

def get_conversation(db: Session, conversation_id: int):
    return db.query(Conversation).filter(Conversation.id == conversation_id).first()

def update_conversation_title(db: Session, conversation_id: int, title: str):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conversation:
        conversation.title = title
        conversation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(conversation)
    return conversation

def create_message(db: Session, conversation_id: int, role: str, content: str, model: str = None):
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        model=model
    )
    db.add(message)
    
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
    return db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at).all()

def create_project_file(db: Session, project_id: int, filename: str, file_size: int, storage_url: str):
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
    return db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()

def delete_project_file(db: Session, file_id: int):
    file = db.query(ProjectFile).filter(ProjectFile.id == file_id).first()
    if file:
        db.delete(file)
        db.commit()
    return True
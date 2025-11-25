from sqlalchemy.orm import Session
from sqlalchemy import desc, text
from typing import List, Optional
from database.models import User, APIKey, Project, Conversation, Message, ProjectFile, CustomIntegration, PasswordResetToken
import bcrypt
from datetime import datetime


def _normalize_email(email: str) -> str:
    """Normalize emails so lookups are case-insensitive and whitespace-safe."""
    if not email:
        return email
    return email.strip().lower()


def create_user(db: Session, user_id: str, email: str, password: str, display_name: str = None):
    normalized_email = _normalize_email(email)
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = User(
        id=user_id,
        email=normalized_email,
        password_hash=password_hash,
        display_name=display_name or normalized_email.split('@')[0]
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_email(db: Session, email: str):
    normalized_email = _normalize_email(email)
    return db.query(User).filter(User.email == normalized_email).first()

def get_user_by_id(db: Session, user_id: str):
    return db.query(User).filter(User.id == user_id).first()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_api_key(db: Session, user_id: str, provider: str, encrypted_key: str, key_name: str = None, key_preview: str = None):
    # Use provided key_preview or generate from encrypted_key as fallback
    if not key_preview:
        # Fallback: use last 6 chars of encrypted key (less ideal but works)
        key_preview = f"...{encrypted_key[-6:]}" if len(encrypted_key) >= 6 else f"...{encrypted_key}"
    
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
        storage_path=storage_url  # Model uses storage_path, not storage_url
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

def create_password_reset_token(db: Session, user_id: str, token: str, expires_at: datetime):
    """Create a password reset token"""
    # Invalidate any existing unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user_id,
        PasswordResetToken.used == False
    ).update({"used": True})
    db.commit()
    
    reset_token = PasswordResetToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at
    )
    db.add(reset_token)
    db.commit()
    db.refresh(reset_token)
    return reset_token

def get_password_reset_token(db: Session, token: str):
    """Get a password reset token by token string"""
    return db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used == False
    ).first()

def mark_password_reset_token_used(db: Session, token_id: int):
    """Mark a password reset token as used"""
    token = db.query(PasswordResetToken).filter(PasswordResetToken.id == token_id).first()
    if token:
        token.used = True
        db.commit()
        db.refresh(token)
    return token

def delete_user(db: Session, user_id: str):
    """Delete a user and all associated data (cascade deletes handle related records)"""
    try:
        # Ensure foreign keys are enabled for this connection (SQLite)
        if hasattr(db.bind, 'url') and db.bind.url.drivername == 'sqlite':
            db.execute(text("PRAGMA foreign_keys=ON"))
        
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Delete related records explicitly in the correct order using raw SQL
        # This avoids model/database schema mismatches and ensures proper deletion
        
        # 1. Get conversation IDs first (without loading full objects)
        conversation_ids_result = db.execute(
            text("SELECT id FROM conversations WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        conversation_ids = [row[0] for row in conversation_ids_result]
        
        # 2. Delete messages (via conversations) using raw SQL
        if conversation_ids:
            # Use SQLAlchemy's in_() method which handles the IN clause properly
            db.query(Message).filter(Message.conversation_id.in_(conversation_ids)).delete(synchronize_session=False)
        
        # 3. Delete conversations using raw SQL
        db.execute(
            text("DELETE FROM conversations WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        
        # 4. Get project IDs first (without loading full objects)
        project_ids_result = db.execute(
            text("SELECT id FROM projects WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        project_ids = [row[0] for row in project_ids_result]
        
        # 5. Delete project files (via projects) using raw SQL to avoid schema mismatch
        # Use raw SQL to avoid loading ProjectFile model which has schema mismatches
        if project_ids:
            # Build parameterized query
            placeholders = ','.join([f':pid{i}' for i in range(len(project_ids))])
            params = {f'pid{i}': pid for i, pid in enumerate(project_ids)}
            db.execute(
                text(f"DELETE FROM project_files WHERE project_id IN ({placeholders})"),
                params
            )
        
        # 6. Delete projects using raw SQL
        db.execute(
            text("DELETE FROM projects WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        
        # 7. Delete password reset tokens using raw SQL
        db.execute(
            text("DELETE FROM password_reset_tokens WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        
        # 8. Delete custom integrations using raw SQL
        db.execute(
            text("DELETE FROM custom_integrations WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        
        # 9. Delete API keys using raw SQL
        db.execute(
            text("DELETE FROM api_keys WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        
        # 10. Finally, delete the user using raw SQL
        db.execute(
            text("DELETE FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        )
        
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise e
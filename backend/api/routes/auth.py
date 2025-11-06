import logging
import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from database import crud
from models.schemas import UserCreate, UserLogin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/signup")
async def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """User registration"""
    try:
        existing_user = crud.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        
        user = crud.create_user(
            db,
            user_id=user_id,
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.display_name
        )
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "display_name": user.display_name
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """User login"""
    try:
        user = crud.get_user_by_email(db, credentials.email)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not crud.verify_password(credentials.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "display_name": user.display_name
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
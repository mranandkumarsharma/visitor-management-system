from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from db_connection import get_db
from db_models import User, SystemLog
from schemas import Token, UserOut
from auth import (
    authenticate_user, 
    create_access_token, 
    get_current_active_user,
    get_password_hash,
    get_client_ip
)
from config import get_settings
from error_handlers import DuplicateError, NotFoundError, BadRequestError

settings = get_settings()
router = APIRouter(prefix=f"{settings.API_PREFIX}/auth", tags=["Authentication"])

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db),
    request: Request = None
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.disabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token, expires_at = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    
    # Log the login
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="login",
        entity_type="user",
        entity_id=user.id,
        user_id=user.id,
        ip_address=client_ip,
        details="User logged in"
    )
    db.add(log_entry)
    db.commit()
    
    # Convert ORM model to Pydantic model
    user_out = UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        department=user.department,
        is_admin=user.is_admin,
        disabled=user.disabled,
        created_at=user.created_at
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_at": expires_at,
        "user": user_out
    }

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    # Log the logout (token can't actually be invalidated with JWT, but we can log it)
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="logout",
        entity_type="user",
        entity_id=current_user.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details="User logged out"
    )
    db.add(log_entry)
    db.commit()
    
    return {"detail": "Logout successful"}

@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user
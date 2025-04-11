from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List

from db_connection import get_db
from db_models import User, SystemLog
from schemas import UserCreate, UserOut, UserUpdate, UserChangePassword
from auth import (
    get_current_active_user, 
    get_admin_user, 
    get_password_hash, 
    verify_password,
    get_client_ip
)
from config import get_settings
from error_handlers import NotFoundError, DuplicateError, BadRequestError, AuthorizationError

settings = get_settings()
router = APIRouter(prefix=f"{settings.API_PREFIX}/users", tags=["Users"])

@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
    request: Request = None
):
    # Check if username or email already exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise DuplicateError("User", "username")
    
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise DuplicateError("User", "email")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        department=user.department,
        hashed_password=hashed_password,
        is_admin=user.is_admin
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Log the action
        client_ip = get_client_ip(request) if request else "unknown"
        log_entry = SystemLog(
            action="create",
            entity_type="user",
            entity_id=new_user.id,
            user_id=current_user.id,
            ip_address=client_ip,
            details=f"Created user: {new_user.username}"
        )
        db.add(log_entry)
        db.commit()
        
        return new_user
    except IntegrityError:
        db.rollback()
        raise DuplicateError("User")

@router.get("/", response_model=List[UserOut])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=UserOut)
async def read_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Regular users can only view their own profile
    if not current_user.is_admin and current_user.id != user_id:
        raise AuthorizationError("Not authorized to view this user's information")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User", user_id)
    
    return user

@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    # Regular users can only update their own profile
    if not current_user.is_admin and current_user.id != user_id:
        raise AuthorizationError("Not authorized to update this user's information")
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise NotFoundError("User", user_id)
    
    # Check if email is being updated and if it's already in use
    if user_update.email and user_update.email != db_user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise DuplicateError("User", "email")
    
    # Update user fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    
    # Log the action
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="update",
        entity_type="user",
        entity_id=db_user.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=f"Updated user: {db_user.username}"
    )
    db.add(log_entry)
    db.commit()
    
    return db_user

@router.post("/{user_id}/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    user_id: str,
    password_change: UserChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    # Regular users can only change their own password
    if not current_user.is_admin and current_user.id != user_id:
        raise AuthorizationError("Not authorized to change this user's password")
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise NotFoundError("User", user_id)
    
    # Admin users can change passwords without verifying the current one
    if not current_user.is_admin or (current_user.is_admin and current_user.id == user_id):
        # Verify current password
        if not verify_password(password_change.current_password, db_user.hashed_password):
            raise BadRequestError("Current password is incorrect")
    
    # Update password
    db_user.hashed_password = get_password_hash(password_change.new_password)
    db.commit()
    
    # Log the action
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="change_password",
        entity_type="user",
        entity_id=db_user.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=f"Changed password for user: {db_user.username}"
    )
    db.add(log_entry)
    db.commit()
    
    return {"detail": "Password changed successfully"}

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
    request: Request = None
):
    # Only admins can delete users
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise NotFoundError("User", user_id)
    
    # Don't allow deleting yourself
    if current_user.id == user_id:
        raise BadRequestError("Cannot delete your own account")
    
    # Log the action before deleting the user
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="delete",
        entity_type="user",
        entity_id=db_user.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=f"Deleted user: {db_user.username}"
    )
    db.add(log_entry)
    db.commit()
    
    # Delete the user
    db.delete(db_user)
    db.commit()
    
    return None
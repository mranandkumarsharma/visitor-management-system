from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
import logging

from db_connection import get_db
from db_models import User
from schemas import TokenData
from config import get_settings

# Configure logging
logger = logging.getLogger("auth")

# Get settings
settings = get_settings()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 token URL
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/token")

# Password functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# User functions
def get_user_by_username(db: Session, username: str):
    try:
        return db.query(User).filter(User.username == username).first()
    except SQLAlchemyError as e:
        logger.error(f"Database error getting user by username: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

def get_user_by_email(db: Session, email: str):
    try:
        return db.query(User).filter(User.email == email).first()
    except SQLAlchemyError as e:
        logger.error(f"Database error getting user by email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred"
        )

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

# JWT functions
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire})
    
    try:
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt, expire
    except Exception as e:
        logger.error(f"Error creating access token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create access token"
        )

# Authentication dependencies
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        logger.warning("JWT token validation failed")
        raise credentials_exception
    
    user = get_user_by_username(db, token_data.username)
    if user is None:
        logger.warning(f"User {token_data.username} not found")
        raise credentials_exception
    
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if current_user.disabled:
        logger.warning(f"Disabled user {current_user.username} attempted access")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    return current_user

async def get_admin_user(current_user: User = Depends(get_current_active_user)):
    if not current_user.is_admin:
        logger.warning(f"Non-admin user {current_user.username} attempted admin access")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Insufficient permissions. Admin role required."
        )
    return current_user

# Visitor permission helper functions
def check_visitor_read_permission(current_user: User, visitor_host_id: str) -> bool:
    """Check if user has permission to read visitor data.
    
    Security personnel can read all visitor data.
    Admins can read all visitor data.
    Regular users can only read their own visitors' data.
    """
    return (current_user.is_admin or 
            current_user.department == "Security" or 
            visitor_host_id == current_user.id)

def check_visitor_write_permission(current_user: User, visitor_host_id: str) -> bool:
    """Check if user has permission to modify visitor data.
    
    Only admins and the host of a visitor can modify visitor data.
    Security personnel cannot modify visitor data unless they are the host.
    """
    return current_user.is_admin or visitor_host_id == current_user.id

def check_visitor_checkin_permission(current_user: User, visitor_host_id: str) -> bool:
    """Check if user has permission to check in/out visitors.
    
    Security personnel can check in/out visitors.
    Admins can check in/out visitors.
    The host of a visitor can check in/out their visitors.
    """
    return (current_user.is_admin or 
            current_user.department == "Security" or 
            visitor_host_id == current_user.id)

def check_visitor_photo_permission(current_user: User, visitor_host_id: str) -> bool:
    """Check if user has permission to upload photos for a visitor.
    
    Security personnel can upload photos.
    Admins can upload photos.
    The host of a visitor can upload photos.
    """
    return (current_user.is_admin or 
            current_user.department == "Security" or 
            visitor_host_id == current_user.id)

# Extract client IP address
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
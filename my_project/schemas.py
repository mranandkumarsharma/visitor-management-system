from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
import re
from db_models import VisitPurpose, VisitStatus

# User Schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    department: str = Field(..., min_length=2, max_length=100)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    is_admin: bool = False

    @field_validator('password')
    def password_strength(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    department: Optional[str] = Field(None, min_length=2, max_length=100)
    disabled: Optional[bool] = None

class UserChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

    @field_validator('new_password')
    def password_strength(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserOut(UserBase):
    id: str
    is_admin: bool
    disabled: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

# Visitor Schemas
class VisitorBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., pattern=r"^\+?[0-9\s\-\(\)]{8,20}$")
    company: Optional[str] = Field(None, max_length=100)
    purpose: VisitPurpose
    host_id: str
    photo_url: Optional[str] = None

class VisitorCreate(VisitorBase):
    scheduled_time: Optional[datetime] = None

class VisitorUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9\s\-\(\)]{8,20}$")
    company: Optional[str] = Field(None, max_length=100)
    purpose: Optional[VisitPurpose] = None
    scheduled_time: Optional[datetime] = None

class VisitorOut(VisitorBase):
    id: str
    status: VisitStatus
    scheduled_time: Optional[datetime] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    created_at: datetime
    host_name: str
    has_photo: bool
    has_badge: bool
    visit_duration: Optional[float] = None

    model_config = {
        "from_attributes": True
    }

# Badge Schemas
class BadgeBase(BaseModel):
    visitor_id: str
    qr_code: str
    expiry_time: datetime

class BadgeOut(BadgeBase):
    id: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

# Approval Schemas
class VisitApproval(BaseModel):
    approved: bool
    notes: Optional[str] = None

# Pre-Approval Schemas
class PreApprovalCreate(VisitorBase):
    scheduled_time: datetime = Field(...)
    visit_duration_minutes: int = Field(60, ge=15, le=480)  # Between 15 minutes and 8 hours

# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserOut

class TokenData(BaseModel):
    username: str

# System Log Schemas
class SystemLogOut(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: str
    user_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    user: Optional[UserOut] = None

    model_config = {
        "from_attributes": True
    }

# Error Schemas
class ErrorResponse(BaseModel):
    detail: str

class ValidationError(BaseModel):
    loc: List[str]
    msg: str
    type: str

class ValidationErrorResponse(BaseModel):
    detail: List[ValidationError]

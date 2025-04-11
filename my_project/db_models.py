from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, Text, LargeBinary
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
import enum
import uuid
from datetime import datetime
from db_connection import Base
import re
from sqlalchemy.ext.hybrid import hybrid_property

def generate_uuid():
    return str(uuid.uuid4())

class VisitPurpose(str, enum.Enum):
    MEETING = "meeting"
    MAINTENANCE = "maintenance"
    INTERVIEW = "interview"
    DELIVERY = "delivery"
    OTHER = "other"

class VisitStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    EXPIRED = "expired"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    disabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    visitors_hosting = relationship("Visitor", back_populates="host", cascade="all, delete-orphan")
    system_logs = relationship("SystemLog", back_populates="user")

    # Validation
    @validates('email')
    def validate_email(self, key, email):
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            raise ValueError("Invalid email format")
        return email

    @validates('username')
    def validate_username(self, key, username):
        if not username or len(username) < 3:
            raise ValueError("Username must be at least 3 characters")
        return username

class Visitor(Base):
    __tablename__ = "visitors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    company = Column(String(100), nullable=True)
    purpose = Column(Enum(VisitPurpose), nullable=False)
    image = Column(String(255), nullable=True)  # URL or path to the image
    host_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(VisitStatus), default=VisitStatus.PENDING)
    scheduled_time = Column(DateTime, nullable=True)
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    host = relationship("User", back_populates="visitors_hosting")
    photo = relationship("VisitorPhoto", uselist=False, back_populates="visitor", cascade="all, delete-orphan")
    badge = relationship("Badge", uselist=False, back_populates="visitor", cascade="all, delete-orphan")

    # Validation
    @validates('email')
    def validate_email(self, key, email):
        if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            raise ValueError("Invalid email format")
        return email

    @validates('phone')
    def validate_phone(self, key, phone):
        # Simple validation for phone number
        if not re.match(r"^\+?[0-9\s\-\(\)]{8,20}$", phone):
            raise ValueError("Invalid phone number format")
        return phone

    # Computed properties
    @hybrid_property
    def visit_duration(self):
        """Calculate visit duration in minutes if both check-in and check-out times exist"""
        if self.check_in_time and self.check_out_time:
            delta = self.check_out_time - self.check_in_time
            return delta.total_seconds() / 60
        return None

class VisitorPhoto(Base):
    __tablename__ = "visitor_photos"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    visitor_id = Column(String(36), ForeignKey("visitors.id", ondelete="CASCADE"), nullable=False, unique=True)
    photo_data = Column(LargeBinary(length=(2**32)-1), nullable=False)  # Use LONGBLOB for storing images
    content_type = Column(String(50), nullable=False)  # Store MIME type (e.g., image/jpeg)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    visitor = relationship("Visitor", back_populates="photo")

class Badge(Base):
    __tablename__ = "badges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    visitor_id = Column(String(36), ForeignKey("visitors.id", ondelete="CASCADE"), nullable=False, unique=True)
    qr_code = Column(String(100), nullable=False, unique=True, index=True)
    expiry_time = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    visitor = relationship("Visitor", back_populates="badge")

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)  # e.g., "visitor", "user", "badge"
    entity_id = Column(String(50), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 addresses can be up to 45 chars
    created_at = Column(DateTime, default=func.now())

    # Relationships
    user = relationship("User", back_populates="system_logs")
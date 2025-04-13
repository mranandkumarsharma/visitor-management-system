from fastapi import APIRouter, Depends, Request, status, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from db_connection import get_db
from db_models import User, Visitor, VisitorPhoto, Badge, SystemLog, VisitStatus, VisitPurpose
from schemas import VisitorCreate, VisitorOut, VisitorUpdate, VisitApproval, PreApprovalCreate
from auth import (
    get_current_active_user, get_client_ip, 
    check_visitor_read_permission, check_visitor_write_permission, 
    check_visitor_checkin_permission, check_visitor_photo_permission
)
from config import get_settings
from error_handlers import NotFoundError, BadRequestError, AuthorizationError

settings = get_settings()
router = APIRouter(prefix=f"{settings.API_PREFIX}/visitors", tags=["Visitors"])

@router.post("/", response_model=VisitorOut, status_code=status.HTTP_201_CREATED)
async def register_visitor(
    visitor: VisitorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    # Ensure host exists
    host = db.query(User).filter(User.id == visitor.host_id).first()
    if not host:
        raise NotFoundError("Host", visitor.host_id)
    
    # Create the visitor
    new_visitor = Visitor(
        full_name=visitor.full_name,
        email=visitor.email,
        phone=visitor.phone,
        company=visitor.company,
        purpose=visitor.purpose,
        host_id=visitor.host_id,
        scheduled_time=visitor.scheduled_time
    )
    
    db.add(new_visitor)
    db.commit()
    db.refresh(new_visitor)
    
    # Log the action
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="create",
        entity_type="visitor",
        entity_id=new_visitor.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=f"Registered visitor: {new_visitor.full_name} for host: {host.full_name}"
    )
    db.add(log_entry)
    db.commit()
    
    # Prepare response data
    result = {
        "id": new_visitor.id,
        "full_name": new_visitor.full_name,
        "email": new_visitor.email,
        "phone": new_visitor.phone,
        "company": new_visitor.company,
        "purpose": new_visitor.purpose,
        "host_id": new_visitor.host_id,
        "host_name": host.full_name,
        "status": new_visitor.status,
        "scheduled_time": new_visitor.scheduled_time,
        "check_in_time": new_visitor.check_in_time,
        "check_out_time": new_visitor.check_out_time,
        "created_at": new_visitor.created_at,
        "has_photo": False,
        "has_badge": False,
        "visit_duration": None
    }
    
    return result

@router.post("/self-register", status_code=status.HTTP_201_CREATED)
async def self_register_visitor(
    visitor: VisitorCreate,
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Public endpoint for visitor self-registration"""
    try:
        # Ensure host exists
        print("Visitor Host ID:", visitor.host_id)
        host = db.query(User).filter(User.id == visitor.host_id).first()
        if not host:
            raise NotFoundError("Host", visitor.host_id)
        
        # Create the visitor with PENDING status
        new_visitor = Visitor(
            full_name=visitor.full_name,
            email=visitor.email,
            phone=visitor.phone,
            company=visitor.company,
            purpose=visitor.purpose,
            host_id=visitor.host_id,
            image=visitor.photo_url,
            scheduled_time=visitor.scheduled_time,
            status=VisitStatus.PENDING
        )
        
        db.add(new_visitor)
        db.commit()
        db.refresh(new_visitor)
        
        # Log the action
        client_ip = get_client_ip(request) if request else "unknown"
        log_entry = SystemLog(
            action="self_register",
            entity_type="visitor",
            entity_id=new_visitor.id,
            user_id=None,  # No user for self-registration
            ip_address=client_ip,
            details=f"Self-registered visitor: {new_visitor.full_name} for host: {host.full_name}"
        )
        db.add(log_entry)
        db.commit()
        
        # Send notification email to host (optional - would implement here)
        
        return {
            "message": "Registration successful. Your request has been sent to the host for approval.",
            "visitor_id": new_visitor.id,
            "host_name": host.full_name,
            "status": VisitStatus.PENDING
        }
    except Exception as e:
        db.rollback()
        if isinstance(e, NotFoundError):
            raise
        raise BadRequestError(f"Failed to register: {str(e)}")

@router.get("/hosts", status_code=status.HTTP_200_OK)
async def get_hosts(
    db: Session = Depends(get_db)
):
    """Public endpoint to get list of hosts for self-registration"""
    try:
        # Get all faculty/non-security users
        hosts = db.query(User).filter(
            User.disabled == False,
            User.department != "Security"
        ).all()
        
        return [
            {
                "id": host.id,
                "name": host.full_name,
                "department": host.department
            }
            for host in hosts
        ]
    except Exception as e:
        raise BadRequestError(f"Failed to retrieve hosts: {str(e)}")

@router.get("/", response_model=List[VisitorOut])
async def list_visitors(
    skip: int = 0,
    limit: int = 100,
    status: Optional[VisitStatus] = None,
    purpose: Optional[VisitPurpose] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    host_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Visitor)

    # Modified permissions - allow security to view all visitors
    if current_user.department == "Security":
        # Security can view all visitors (read-only access)
        pass  # Don't filter by host
    elif not current_user.is_admin:
        # Regular faculty can only see their own visitors
        query = query.filter(Visitor.host_id == current_user.id)
    elif host_id:
        # Admin with specific host filter
        query = query.filter(Visitor.host_id == host_id)

    # Apply query filters
    if status:
        query = query.filter(Visitor.status == status)
    if purpose:
        query = query.filter(Visitor.purpose == purpose)
    if start_date:
        # Fix timezone issue
        start_date = start_date.replace(tzinfo=None)
        query = query.filter(Visitor.created_at >= start_date)
    if end_date:
        # Fix timezone issue
        end_date = end_date.replace(tzinfo=None)
        query = query.filter(Visitor.created_at <= end_date)

    # Pagination and ordering
    visitors = (
        query.order_by(Visitor.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Construct output list
    result = []
    for visitor in visitors:
        host = db.query(User).filter(User.id == visitor.host_id).first()
        has_badge = db.query(Badge).filter(Badge.visitor_id == visitor.id).first() is not None

        # Calculate visit duration if both check-in and check-out times exist
        visit_duration = None
        if visitor.check_in_time and visitor.check_out_time:
            # Fix timezone issue
            check_in = visitor.check_in_time.replace(tzinfo=None)
            check_out = visitor.check_out_time.replace(tzinfo=None)
            visit_duration = (check_out - check_in).total_seconds() / 60

        result.append({
            "id": visitor.id,
            "full_name": visitor.full_name,
            "email": visitor.email,
            "phone": visitor.phone,
            "company": visitor.company,
            "purpose": visitor.purpose,
            "host_id": visitor.host_id,
            "host_name": host.full_name if host else "Unknown",
            "status": visitor.status,
            "scheduled_time": visitor.scheduled_time,
            "check_in_time": visitor.check_in_time,
            "check_out_time": visitor.check_out_time,
            "created_at": visitor.created_at,
            "has_photo": bool(visitor.image),
            "has_badge": has_badge,
            "visit_duration": visit_duration
        })

    return result


@router.get("/{visitor_id}", response_model=VisitorOut)
async def get_visitor(
    visitor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", visitor_id)
    
    # Use the permission check function
    if not check_visitor_read_permission(current_user, visitor.host_id):
        raise AuthorizationError("Not authorized to view this visitor's information")
    
    host = db.query(User).filter(User.id == visitor.host_id).first()
    has_photo = db.query(VisitorPhoto).filter(VisitorPhoto.visitor_id == visitor.id).first() is not None
    has_badge = db.query(Badge).filter(Badge.visitor_id == visitor.id).first() is not None
    
    visit_duration = None
    if visitor.check_in_time and visitor.check_out_time:
        # Fix timezone issue
        check_in = visitor.check_in_time.replace(tzinfo=None)
        check_out = visitor.check_out_time.replace(tzinfo=None)
        visit_duration = (check_out - check_in).total_seconds() / 60  # Duration in minutes
    
    result = {
        "id": visitor.id,
        "full_name": visitor.full_name,
        "email": visitor.email,
        "phone": visitor.phone,
        "company": visitor.company,
        "purpose": visitor.purpose,
        "host_id": visitor.host_id,
        "host_name": host.full_name if host else "Unknown",
        "status": visitor.status,
        "scheduled_time": visitor.scheduled_time,
        "check_in_time": visitor.check_in_time,
        "check_out_time": visitor.check_out_time,
        "created_at": visitor.created_at,
        "has_photo": has_photo,
        "has_badge": has_badge,
        "visit_duration": visit_duration
    }
    
    return result

@router.put("/{visitor_id}", response_model=VisitorOut)
async def update_visitor(
    visitor_id: str,
    visitor_update: VisitorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", visitor_id)
    
    # Use the permission check function
    if not check_visitor_write_permission(current_user, visitor.host_id):
        raise AuthorizationError("Not authorized to update this visitor's information")
    
    # Don't allow updating if visitor is already checked in or checked out
    if visitor.status in [VisitStatus.CHECKED_IN, VisitStatus.CHECKED_OUT]:
        raise BadRequestError("Cannot update visitor after check-in")
    
    # Update visitor fields
    update_data = visitor_update.dict(exclude_unset=True)
    
    # Validate host_id if provided
    if "host_id" in update_data:
        host = db.query(User).filter(User.id == update_data["host_id"]).first()
        if not host:
            raise NotFoundError("Host", update_data["host_id"])
    
    # Update fields
    for field, value in update_data.items():
        setattr(visitor, field, value)
    
    db.commit()
    db.refresh(visitor)
    
    # Log the action
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="update",
        entity_type="visitor",
        entity_id=visitor.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=f"Updated visitor: {visitor.full_name}"
    )
    db.add(log_entry)
    db.commit()
    
    # Prepare response
    host = db.query(User).filter(User.id == visitor.host_id).first()
    has_photo = db.query(VisitorPhoto).filter(VisitorPhoto.visitor_id == visitor.id).first() is not None
    has_badge = db.query(Badge).filter(Badge.visitor_id == visitor.id).first() is not None
    
    visit_duration = None
    if visitor.check_in_time and visitor.check_out_time:
        # Fix timezone issue
        check_in = visitor.check_in_time.replace(tzinfo=None)
        check_out = visitor.check_out_time.replace(tzinfo=None)
        visit_duration = (check_out - check_in).total_seconds() / 60
    
    result = {
        "id": visitor.id,
        "full_name": visitor.full_name,
        "email": visitor.email,
        "phone": visitor.phone,
        "company": visitor.company,
        "purpose": visitor.purpose,
        "host_id": visitor.host_id,
        "host_name": host.full_name if host else "Unknown",
        "status": visitor.status,
        "scheduled_time": visitor.scheduled_time,
        "check_in_time": visitor.check_in_time,
        "check_out_time": visitor.check_out_time,
        "created_at": visitor.created_at,
        "has_photo": has_photo,
        "has_badge": has_badge,
        "visit_duration": visit_duration
    }
    
    return result

@router.post("/{visitor_id}/photo", status_code=status.HTTP_200_OK)
async def upload_visitor_photo(
    visitor_id: str,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", visitor_id)
    
    # Use the new photo permission check function
    if not check_visitor_photo_permission(current_user, visitor.host_id):
        raise AuthorizationError("Not authorized to upload photo for this visitor")
    
    # Validate photo content type
    valid_content_types = ["image/jpeg", "image/png", "image/jpg"]
    if photo.content_type not in valid_content_types:
        raise BadRequestError("Invalid photo format. Only JPG and PNG are allowed.")
    
    # Read photo content
    photo_data = await photo.read()
    
    # Check existing photo
    existing_photo = db.query(VisitorPhoto).filter(VisitorPhoto.visitor_id == visitor_id).first()
    
    if existing_photo:
        # Update existing photo
        existing_photo.photo_data = photo_data
        existing_photo.content_type = photo.content_type
        photo_id = existing_photo.id
        
        log_action = "update"
        log_message = f"Updated photo for visitor: {visitor.full_name}"
    else:
        # Create new photo record
        new_photo = VisitorPhoto(
            visitor_id=visitor_id,
            photo_data=photo_data,
            content_type=photo.content_type
        )
        db.add(new_photo)
        db.flush()  # Get ID without committing transaction
        photo_id = new_photo.id
        
        log_action = "create"
        log_message = f"Uploaded photo for visitor: {visitor.full_name}"
    
    # Log the action
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action=log_action,
        entity_type="photo",
        entity_id=photo_id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=log_message
    )
    db.add(log_entry)
    db.commit()
    
    return {"detail": "Photo uploaded successfully", "photo_id": photo_id}

@router.post("/{visitor_id}/approval", status_code=status.HTTP_200_OK)
async def approve_or_reject_visitor(
    visitor_id: str,
    approval: VisitApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", visitor_id)
    
    # Use permission check function
    if not check_visitor_write_permission(current_user, visitor.host_id):
        raise AuthorizationError("Not authorized to approve/reject this visitor")
    
    # Don't allow approval/rejection for visitors who are already checked in or out
    if visitor.status in [VisitStatus.CHECKED_IN, VisitStatus.CHECKED_OUT]:
        raise BadRequestError(f"Cannot approve/reject visitor with status: {visitor.status}")
    
    badge_info = {}
    
    # Update status based on approval decision
    if approval.approved:
        visitor.status = VisitStatus.APPROVED
        
        # Generate badge if it doesn't exist
        existing_badge = db.query(Badge).filter(Badge.visitor_id == visitor_id).first()
        
        if not existing_badge:
            # Create new badge
            qr_code = f"VMS-{str(uuid.uuid4())}"
            expiry_time = datetime.utcnow() + timedelta(days=1)
            
            new_badge = Badge(
                visitor_id=visitor_id,
                qr_code=qr_code,
                expiry_time=expiry_time
            )
            
            db.add(new_badge)
            db.flush()
            
            badge_info = {
                "badge_id": new_badge.id,
                "qr_code": qr_code,
                "expiry_time": expiry_time
            }
            
            log_message = f"Approved visitor: {visitor.full_name} and created badge"
        else:
            # Use existing badge
            badge_info = {
                "badge_id": existing_badge.id,
                "qr_code": existing_badge.qr_code,
                "expiry_time": existing_badge.expiry_time
            }
            
            log_message = f"Approved visitor: {visitor.full_name} with existing badge"
    else:
        visitor.status = VisitStatus.REJECTED
        log_message = f"Rejected visitor: {visitor.full_name}"
        
        if approval.notes:
            log_message += f", Reason: {approval.notes}"
    
    # Log the action
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="approve" if approval.approved else "reject",
        entity_type="visitor",
        entity_id=visitor.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=log_message
    )
    db.add(log_entry)
    db.commit()
    
    result = {
        "detail": "Visitor approved" if approval.approved else "Visitor rejected",
        "visitor_id": visitor_id,
        "status": visitor.status.value
    }
    
    if approval.approved:
        result.update(badge_info)
    
    return result

@router.post("/{visitor_id}/reject", status_code=status.HTTP_200_OK)
async def reject_visitor(
    visitor_id: str,
    rejection: VisitApproval,  # reuse the same model with `approved=False` and optional notes
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", visitor_id)

    # Use permission check function
    if not check_visitor_write_permission(current_user, visitor.host_id):
        raise AuthorizationError("Not authorized to reject this visitor")

    # Cannot reject a visitor who is already checked in or out
    if visitor.status in [VisitStatus.CHECKED_IN, VisitStatus.CHECKED_OUT]:
        raise BadRequestError(f"Cannot reject visitor with status: {visitor.status}")

    # Reject the visitor
    visitor.status = VisitStatus.REJECTED

    log_message = f"Rejected visitor: {visitor.full_name}"
    if rejection.notes:
        log_message += f", Reason: {rejection.notes}"

    # Log the action
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="reject",
        entity_type="visitor",
        entity_id=visitor.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=log_message
    )

    db.add(log_entry)
    db.commit()

    return {
        "detail": "Visitor rejected",
        "visitor_id": visitor_id,
        "status": visitor.status.value
    }

@router.post("/{visitor_id}/check-in", status_code=status.HTTP_200_OK)
async def check_in_visitor(
    visitor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", visitor_id)
    
    # Use permission check function - allow security to check in
    if not check_visitor_checkin_permission(current_user, visitor.host_id):
        raise AuthorizationError("Not authorized to check in this visitor")
    
    # Verify visitor status
    if visitor.status != VisitStatus.APPROVED:
        raise BadRequestError(f"Cannot check in visitor with status: {visitor.status}")
    
    # Check if photo is captured
    has_photo = db.query(VisitorPhoto).filter(VisitorPhoto.visitor_id == visitor_id).first() is not None
    if not has_photo:
        raise BadRequestError("Photo must be captured before check-in")
    
    # Record check-in time
    timestamp = datetime.utcnow()
    visitor.check_in_time = timestamp
    visitor.status = VisitStatus.CHECKED_IN
    
    # Log the action
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="check_in",
        entity_type="visitor",
        entity_id=visitor.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=f"Checked in visitor: {visitor.full_name}"
    )
    db.add(log_entry)
    db.commit()
    
    return {
        "detail": "Visitor checked in successfully",
        "visitor_id": visitor_id,
        "check_in_time": timestamp,
        "status": VisitStatus.CHECKED_IN.value
    }

@router.post("/{visitor_id}/check-out", status_code=status.HTTP_200_OK)
async def check_out_visitor(
    visitor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", visitor_id)
    
    # Use permission check function - allow security to check out
    if not check_visitor_checkin_permission(current_user, visitor.host_id):
        raise AuthorizationError("Not authorized to check out this visitor")
    
    # Verify visitor status
    if visitor.status != VisitStatus.CHECKED_IN:
        raise BadRequestError(f"Cannot check out visitor with status: {visitor.status}")
    
    # Record check-out time
    timestamp = datetime.utcnow()
    visitor.check_out_time = timestamp
    visitor.status = VisitStatus.CHECKED_OUT
    
    # Calculate visit duration
    # Fix timezone issue
    check_in = visitor.check_in_time.replace(tzinfo=None)
    check_out = timestamp.replace(tzinfo=None)
    delta = check_out - check_in
    visit_duration = delta.total_seconds() / 60  # Duration in minutes
    
    # Log the action
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="check_out",
        entity_type="visitor",
        entity_id=visitor.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=f"Checked out visitor: {visitor.full_name}, Duration: {visit_duration:.1f} minutes"
    )
    db.add(log_entry)
    db.commit()
    
    return {
        "detail": "Visitor checked out successfully",
        "visitor_id": visitor_id,
        "check_out_time": timestamp,
        "status": VisitStatus.CHECKED_OUT.value,
        "visit_duration": visit_duration
    }

@router.delete("/{visitor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_visitor(
    visitor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", visitor_id)
    
    # Use permission check function
    if not check_visitor_write_permission(current_user, visitor.host_id):
        raise AuthorizationError("Not authorized to delete this visitor")
    
    # Don't allow deletion of visitors who are checked in
    if visitor.status == VisitStatus.CHECKED_IN:
        raise BadRequestError("Cannot delete a visitor who is currently checked in")
    
    # Log the action before deleting
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="delete",
        entity_type="visitor",
        entity_id=visitor.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=f"Deleted visitor: {visitor.full_name}"
    )
    db.add(log_entry)
    
    # Delete the visitor (cascades to photos and badges)
    db.delete(visitor)
    db.commit()
    
    return None

@router.post("/pre-approval", response_model=VisitorOut, status_code=status.HTTP_201_CREATED)
async def create_pre_approval(
    pre_approval: PreApprovalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    # Check if scheduled time is in the future
    # Fix timezone issue
    scheduled_time = pre_approval.scheduled_time.replace(tzinfo=None)
    now = datetime.utcnow()
    if scheduled_time <= now:
        raise BadRequestError("Scheduled time must be in the future")
    
    # Create visitor with approved status
    new_visitor = Visitor(
        full_name=pre_approval.full_name,
        email=pre_approval.email,
        phone=pre_approval.phone,
        company=pre_approval.company,
        purpose=pre_approval.purpose,
        host_id=pre_approval.host_id,
        scheduled_time=pre_approval.scheduled_time,
        status=VisitStatus.APPROVED  # Pre-approved
    )
    
    db.add(new_visitor)
    db.flush()
    
    # Create badge
    qr_code = f"VMS-PRE-{str(uuid.uuid4())}"
    expiry_time = pre_approval.scheduled_time + timedelta(minutes=pre_approval.visit_duration_minutes)
    
    new_badge = Badge(
        visitor_id=new_visitor.id,
        qr_code=qr_code,
        expiry_time=expiry_time
    )
    
    db.add(new_badge)
    
    # Log the action
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="pre_approve",
        entity_type="visitor",
        entity_id=new_visitor.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=f"Pre-approved visitor: {new_visitor.full_name}, Scheduled: {pre_approval.scheduled_time}"
    )
    db.add(log_entry)
    db.commit()
    db.refresh(new_visitor)
    
    # Prepare response
    host = db.query(User).filter(User.id == new_visitor.host_id).first()
    
    result = {
        "id": new_visitor.id,
        "full_name": new_visitor.full_name,
        "email": new_visitor.email,
        "phone": new_visitor.phone,
        "company": new_visitor.company,
        "purpose": new_visitor.purpose,
        "host_id": new_visitor.host_id,
        "host_name": host.full_name if host else "Unknown",
        "status": new_visitor.status,
        "scheduled_time": new_visitor.scheduled_time,
        "check_in_time": new_visitor.check_in_time,
        "check_out_time": new_visitor.check_out_time,
        "created_at": new_visitor.created_at,
        "has_photo": False,
        "has_badge": True,
        "visit_duration": None,
        "qr_code": qr_code,
        "expiry_time": expiry_time
    }
    
    return result
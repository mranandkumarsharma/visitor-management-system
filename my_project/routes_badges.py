from fastapi import APIRouter, Depends, Request, status, Response
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import qrcode
from io import BytesIO

from db_connection import get_db
from db_models import User, Visitor, Badge, SystemLog, VisitStatus
from auth import get_current_active_user, get_client_ip
from config import get_settings
from error_handlers import NotFoundError, BadRequestError

settings = get_settings()
router = APIRouter(prefix=f"{settings.API_PREFIX}/badges", tags=["Badges"])

@router.get("/{qr_code}/verify")
async def verify_badge(
    qr_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    # Find the badge by QR code
    badge = db.query(Badge).filter(Badge.qr_code == qr_code).first()
    if not badge:
        raise NotFoundError("Badge", f"with QR code {qr_code}")
    
    # Get the visitor
    visitor = db.query(Visitor).filter(Visitor.id == badge.visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", badge.visitor_id)
    
    # Check if badge is expired
    is_expired = badge.expiry_time < datetime.utcnow()
    
    # Log the verification
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="verify_badge",
        entity_type="badge",
        entity_id=badge.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=f"Verified badge for visitor: {visitor.full_name}, Valid: {not is_expired}"
    )
    db.add(log_entry)
    
    # If expired, update visitor status
    if is_expired and visitor.status != VisitStatus.CHECKED_OUT:
        visitor.status = VisitStatus.EXPIRED
        db.commit()
        
        return {
            "valid": False,
            "message": "Badge has expired",
            "badge_id": badge.id,
            "visitor_id": visitor.id,
            "visitor_name": visitor.full_name,
            "expiry_time": badge.expiry_time
        }
    
    # Get host information
    host = None
    if visitor.host_id:
        host = db.query(User).filter(User.id == visitor.host_id).first()
    
    # Commit the log
    db.commit()
    
    result = {
        "valid": not is_expired and visitor.status not in [VisitStatus.REJECTED, VisitStatus.EXPIRED, VisitStatus.CHECKED_OUT],
        "badge_id": badge.id,
        "visitor_id": visitor.id,
        "visitor_name": visitor.full_name,
        "visitor_email": visitor.email,
        "visitor_phone": visitor.phone,
        "visitor_company": visitor.company,
        "purpose": visitor.purpose.value,
        "host_name": host.full_name if host else "N/A",
        "host_department": host.department if host else "N/A",
        "status": visitor.status.value,
        "created_at": badge.created_at,
        "expiry_time": badge.expiry_time,
        "scheduled_time": visitor.scheduled_time,
        "check_in_time": visitor.check_in_time,
        "check_out_time": visitor.check_out_time
    }
    
    return result

@router.get("/{qr_code}/image", response_class=Response)
async def get_badge_qr_code(
    qr_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Find the badge by QR code
    badge = db.query(Badge).filter(Badge.qr_code == qr_code).first()
    if not badge:
        raise NotFoundError("Badge", f"with QR code {qr_code}")
    
    # Get the visitor
    visitor = db.query(Visitor).filter(Visitor.id == badge.visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", badge.visitor_id)
    
    # Generate QR code image
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_code)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save image to BytesIO buffer
    buf = BytesIO()
    img.save(buf)
    buf.seek(0)
    
    return Response(content=buf.read(), media_type="image/png")

@router.get("/visitor/{visitor_id}", status_code=status.HTTP_200_OK)
async def get_visitor_badge(
    visitor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if visitor exists
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", visitor_id)
    
    # Regular users can only access badges for their own visitors
    if not current_user.is_admin and visitor.host_id != current_user.id:
        raise BadRequestError("Not authorized to access this visitor's badge")
    
    # Get the badge
    badge = db.query(Badge).filter(Badge.visitor_id == visitor_id).first()
    if not badge:
        raise NotFoundError("Badge", f"for visitor {visitor_id}")
    
    # Check if badge is expired
    is_expired = badge.expiry_time < datetime.utcnow()
    
    # Format the response
    result = {
        "badge_id": badge.id,
        "visitor_id": visitor.id,
        "visitor_name": visitor.full_name,
        "qr_code": badge.qr_code,
        "created_at": badge.created_at,
        "expiry_time": badge.expiry_time,
        "is_expired": is_expired,
        "status": visitor.status.value
    }
    
    return result

@router.post("/{badge_id}/extend", status_code=status.HTTP_200_OK)
async def extend_badge_expiry(
    badge_id: str,
    extend_minutes: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    if extend_minutes <= 0 or extend_minutes > 1440:  # Max 24 hours
        raise BadRequestError("Extension time must be between 1 and 1440 minutes")
    
    # Find the badge
    badge = db.query(Badge).filter(Badge.id == badge_id).first()
    if not badge:
        raise NotFoundError("Badge", badge_id)
    
    # Get the visitor
    visitor = db.query(Visitor).filter(Visitor.id == badge.visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", badge.visitor_id)
    
    # Regular users can only extend badges for their own visitors
    if not current_user.is_admin and visitor.host_id != current_user.id:
        raise BadRequestError("Not authorized to extend this badge")
    
    # Check if visitor is in a valid state
    if visitor.status in [VisitStatus.REJECTED, VisitStatus.CHECKED_OUT]:
        raise BadRequestError(f"Cannot extend badge for visitor with status: {visitor.status}")
    
    # Extend the expiry time
    from datetime import timedelta
    
    # If expired, start from current time
    if badge.expiry_time < datetime.utcnow():
        badge.expiry_time = datetime.utcnow() + timedelta(minutes=extend_minutes)
        
        # If the visitor status was EXPIRED, update it back to APPROVED or CHECKED_IN
        if visitor.status == VisitStatus.EXPIRED:
            visitor.status = VisitStatus.APPROVED if not visitor.check_in_time else VisitStatus.CHECKED_IN
    else:
        # Otherwise, add to existing expiry time
        badge.expiry_time = badge.expiry_time + timedelta(minutes=extend_minutes)
    
    # Log the action
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="extend_badge",
        entity_type="badge",
        entity_id=badge.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=f"Extended badge expiry for visitor: {visitor.full_name} by {extend_minutes} minutes"
    )
    db.add(log_entry)
    db.commit()
    
    return {
        "detail": f"Badge expiry extended by {extend_minutes} minutes",
        "badge_id": badge.id,
        "visitor_id": visitor.id,
        "new_expiry_time": badge.expiry_time
    }

@router.delete("/{badge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def invalidate_badge(
    badge_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    # Find the badge
    badge = db.query(Badge).filter(Badge.id == badge_id).first()
    if not badge:
        raise NotFoundError("Badge", badge_id)
    
    # Get the visitor
    visitor = db.query(Visitor).filter(Visitor.id == badge.visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", badge.visitor_id)
    
    # Regular users can only invalidate badges for their own visitors
    if not current_user.is_admin and visitor.host_id != current_user.id:
        raise BadRequestError("Not authorized to invalidate this badge")
    
    # Log the action
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="invalidate_badge",
        entity_type="badge",
        entity_id=badge.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=f"Invalidated badge for visitor: {visitor.full_name}"
    )
    db.add(log_entry)
    
    # Set visitor status to EXPIRED if currently APPROVED
    if visitor.status == VisitStatus.APPROVED:
        visitor.status = VisitStatus.EXPIRED
    
    # Delete the badge
    db.delete(badge)
    db.commit()
    
    return None
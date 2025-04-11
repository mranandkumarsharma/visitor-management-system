from fastapi import APIRouter, Depends, Request, status, Response
from sqlalchemy.orm import Session

from db_connection import get_db
from db_models import User, Visitor, VisitorPhoto, SystemLog
from auth import get_current_active_user
from config import get_settings
from error_handlers import NotFoundError, AuthorizationError

settings = get_settings()
router = APIRouter(prefix=f"{settings.API_PREFIX}/photos", tags=["Photos"])

@router.get("/{photo_id}", response_class=Response)
async def get_visitor_photo(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Find the photo
    photo = db.query(VisitorPhoto).filter(VisitorPhoto.id == photo_id).first()
    if not photo:
        raise NotFoundError("Photo", photo_id)
    
    # Get the associated visitor
    visitor = db.query(Visitor).filter(Visitor.id == photo.visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", photo.visitor_id)
    
    # Regular users can only access photos for their own visitors
    if not current_user.is_admin and visitor.host_id != current_user.id:
        raise AuthorizationError("Not authorized to access this visitor's photo")
    
    # Return the photo with appropriate content type
    return Response(content=photo.photo_data, media_type=photo.content_type)

@router.get("/visitor/{visitor_id}", response_class=Response)
async def get_photo_by_visitor(
    visitor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if visitor exists
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", visitor_id)
    
    # Regular users can only access photos for their own visitors
    if not current_user.is_admin and visitor.host_id != current_user.id:
        raise AuthorizationError("Not authorized to access this visitor's photo")
    
    # Get the photo
    photo = db.query(VisitorPhoto).filter(VisitorPhoto.visitor_id == visitor_id).first()
    if not photo:
        raise NotFoundError("Photo", f"for visitor {visitor_id}")
    
    # Return the photo with appropriate content type
    return Response(content=photo.photo_data, media_type=photo.content_type)

@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_visitor_photo(
    photo_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: Request = None
):
    # Find the photo
    photo = db.query(VisitorPhoto).filter(VisitorPhoto.id == photo_id).first()
    if not photo:
        raise NotFoundError("Photo", photo_id)
    
    # Get the associated visitor
    visitor = db.query(Visitor).filter(Visitor.id == photo.visitor_id).first()
    if not visitor:
        raise NotFoundError("Visitor", photo.visitor_id)
    
    # Regular users can only delete photos for their own visitors
    if not current_user.is_admin and visitor.host_id != current_user.id:
        raise AuthorizationError("Not authorized to delete this visitor's photo")
    
    # Log the action
    from auth import get_client_ip
    client_ip = get_client_ip(request) if request else "unknown"
    log_entry = SystemLog(
        action="delete",
        entity_type="photo",
        entity_id=photo.id,
        user_id=current_user.id,
        ip_address=client_ip,
        details=f"Deleted photo for visitor: {visitor.full_name}"
    )
    db.add(log_entry)
    
    # Delete the photo
    db.delete(photo)
    db.commit()
    
    return None
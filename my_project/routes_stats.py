from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from db_connection import get_db
from db_models import User, Visitor, Badge, SystemLog, VisitStatus, VisitPurpose
from auth import get_admin_user
from config import get_settings

settings = get_settings()
router = APIRouter(prefix=f"{settings.API_PREFIX}/stats", tags=["Statistics"])

@router.get("/visitors")
async def get_visitor_stats(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get visitor statistics - admin only"""
    
    # Set default date range if not provided
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)  # Default to last 30 days
    
    # Query for total counts by status
    query = db.query(
        Visitor.status,
        func.count(Visitor.id).label("count")
    ).filter(
        Visitor.created_at.between(start_date, end_date)
    ).group_by(
        Visitor.status
    )
    
    status_counts = {status.value: 0 for status in VisitStatus}
    for result in query:
        status_counts[result.status.value] = result.count
    
    # Get total count
    total_count = sum(status_counts.values())
    
    # Query for counts by purpose
    purpose_query = db.query(
        Visitor.purpose,
        func.count(Visitor.id).label("count")
    ).filter(
        Visitor.created_at.between(start_date, end_date)
    ).group_by(
        Visitor.purpose
    )
    
    purpose_counts = {purpose.value: 0 for purpose in VisitPurpose}
    for result in purpose_query:
        purpose_counts[result.purpose.value] = result.count
    
    # Calculate average visit duration for completed visits
    duration_query = db.query(
        func.avg(
            func.timestampdiff(
                'minute',
                Visitor.check_in_time,
                Visitor.check_out_time
            )
        ).label('avg_duration')
    ).filter(
        Visitor.check_in_time.isnot(None),
        Visitor.check_out_time.isnot(None),
        Visitor.created_at.between(start_date, end_date)
    )
    
    avg_duration_result = duration_query.first()
    avg_duration = avg_duration_result.avg_duration if avg_duration_result.avg_duration else 0
    
    # Calculate visitors per day
    daily_query = db.query(
        func.date(Visitor.created_at).label('date'),
        func.count(Visitor.id).label('count')
    ).filter(
        Visitor.created_at.between(start_date, end_date)
    ).group_by(
        func.date(Visitor.created_at)
    ).order_by(
        func.date(Visitor.created_at)
    )
    
    daily_counts = []
    for result in daily_query:
        daily_counts.append({
            "date": result.date.isoformat(),
            "count": result.count
        })
    
    return {
        "total_visitors": total_count,
        "date_range": {
            "start_date": start_date,
            "end_date": end_date
        },
        "status_counts": status_counts,
        "purpose_counts": purpose_counts,
        "average_visit_duration_minutes": float(avg_duration) if avg_duration else 0,
        "daily_counts": daily_counts
    }

@router.get("/hosts")
async def get_host_stats(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get host statistics - admin only"""
    
    # Set default date range if not provided
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)  # Default to last 30 days
    
    # Query for top hosts by visitor count
    hosts_query = db.query(
        Visitor.host_id,
        User.full_name.label('host_name'),
        User.department.label('department'),
        func.count(Visitor.id).label('visitor_count')
    ).join(
        User, User.id == Visitor.host_id
    ).filter(
        Visitor.created_at.between(start_date, end_date)
    ).group_by(
        Visitor.host_id, User.full_name, User.department
    ).order_by(
        func.count(Visitor.id).desc()
    ).limit(limit)
    
    top_hosts = []
    for result in hosts_query:
        top_hosts.append({
            "host_id": result.host_id,
            "host_name": result.host_name,
            "department": result.department,
            "visitor_count": result.visitor_count
        })
    
    # Query for departments
    departments_query = db.query(
        User.department,
        func.count(Visitor.id).label('visitor_count')
    ).join(
        Visitor, User.id == Visitor.host_id
    ).filter(
        Visitor.created_at.between(start_date, end_date)
    ).group_by(
        User.department
    ).order_by(
        func.count(Visitor.id).desc()
    )
    
    departments = []
    for result in departments_query:
        departments.append({
            "department": result.department,
            "visitor_count": result.visitor_count
        })
    
    return {
        "date_range": {
            "start_date": start_date,
            "end_date": end_date
        },
        "top_hosts": top_hosts,
        "departments": departments
    }

@router.get("/system")
async def get_system_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get system statistics - admin only"""
    
    # Get counts of various entities
    users_count = db.query(func.count(User.id)).scalar()
    visitors_count = db.query(func.count(Visitor.id)).scalar()
    active_badges_count = db.query(func.count(Badge.id)).filter(
        Badge.expiry_time > datetime.utcnow()
    ).scalar()
    logs_count = db.query(func.count(SystemLog.id)).scalar()
    
    # Get recent activity
    recent_logs = db.query(
        SystemLog.action,
        SystemLog.entity_type,
        SystemLog.created_at,
        User.username.label('username')
    ).join(
        User, User.id == SystemLog.user_id
    ).order_by(
        SystemLog.created_at.desc()
    ).limit(10)
    
    recent_activity = []
    for log in recent_logs:
        recent_activity.append({
            "action": log.action,
            "entity_type": log.entity_type,
            "created_at": log.created_at,
            "username": log.username
        })
    
    # Get active check-ins
    active_checkins = db.query(func.count(Visitor.id)).filter(
        Visitor.status == VisitStatus.CHECKED_IN
    ).scalar()
    
    # Get impending visits for today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    upcoming_visits = db.query(func.count(Visitor.id)).filter(
        Visitor.status == VisitStatus.APPROVED,
        Visitor.scheduled_time.between(today_start, today_end)
    ).scalar()
    
    return {
        "counts": {
            "users": users_count,
            "visitors": visitors_count,
            "active_badges": active_badges_count,
            "logs": logs_count,
            "active_checkins": active_checkins,
            "upcoming_visits_today": upcoming_visits
        },
        "recent_activity": recent_activity,
        "system_time": datetime.utcnow()
    }

@router.get("/health")
async def health_check():
    """System health check - public"""
    from sqlalchemy.exc import SQLAlchemyError
    
    try:
        # Check database connection
        db = next(get_db())
        db_status = "healthy"
        db.execute("SELECT 1")
    except SQLAlchemyError as e:
        db_status = f"unhealthy: {str(e)}"
    
    import psutil
    
    # Get system memory usage
    memory = psutil.virtual_memory()
    memory_usage = {
        "total": memory.total,
        "available": memory.available,
        "percent": memory.percent,
        "used": memory.used,
    }
    
    # Get CPU usage
    cpu_percent = psutil.cpu_percent(interval=0.1)
    
    # Get disk usage
    disk = psutil.disk_usage('/')
    disk_usage = {
        "total": disk.total,
        "used": disk.used,
        "free": disk.free,
        "percent": disk.percent
    }
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "database": db_status,
        "system": {
            "memory": memory_usage,
            "cpu_percent": cpu_percent,
            "disk": disk_usage
        }
    }
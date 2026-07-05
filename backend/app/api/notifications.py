from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import Notification
from app.schemas.schemas import NotificationResponse

router = APIRouter(tags=["Notifications"])


@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(
    limit: int = 100, db: Session = Depends(get_db)
) -> List[NotificationResponse]:
    """Retrieves all notifications."""
    return db.query(Notification).order_by(Notification.created_at.desc()).limit(limit).all()


@router.post("/notifications/{id}/read", response_model=NotificationResponse)
def mark_notification_read(id: int, db: Session = Depends(get_db)) -> NotificationResponse:
    """Marks a specific notification as read."""
    notif = db.query(Notification).filter(Notification.id == id).first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification with ID {id} not found.",
        )
    notif.read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/notifications/read-all")
def mark_all_notifications_read(db: Session = Depends(get_db)):
    """Marks all notifications as read."""
    db.query(Notification).filter(Notification.read == False).update({"read": True})
    db.commit()
    return {"success": True, "message": "All notifications marked as read."}

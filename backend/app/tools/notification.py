from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.tools.base import BaseTool
from app.models.models import Notification


class NotificationTool(BaseTool):
    @property
    def name(self) -> str:
        return "notification_tool"

    @property
    def description(self) -> str:
        return "Dispatches real-time events and system alerts to the operator dashboard UI."

    def publish_notification(
        self,
        db: Session,
        notification_type: str,
        message: str,
        workflow_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Creates a system notification event, stored in the DB for the dashboard UI to consume."""
        try:
            notif = Notification(
                workflow_id=workflow_id,
                type=notification_type,
                message=message,
                read=False,
            )
            db.add(notif)
            db.commit()
            db.refresh(notif)

            return {
                "notification_id": notif.id,
                "type": notification_type,
                "message": message,
                "status": "published",
                "success": True,
            }
        except Exception as e:
            return {"status": "failed", "error": str(e), "success": False}

    def publish_approval_request(
        self, db: Session, workflow_id: int, quotation_number: str, amount: float
    ) -> Dict[str, Any]:
        """Specific helper to notify operators that a Quotation needs human-in-the-loop review."""
        msg = f"Quotation {quotation_number} (${amount:,.2f}) requires your approval to proceed."
        return self.publish_notification(
            db, "APPROVAL_REQUEST", msg, workflow_id=workflow_id
        )

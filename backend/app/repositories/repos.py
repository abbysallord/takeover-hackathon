from typing import List, Optional, Any
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.models import (
    Customer,
    Lead,
    Email,
    Workflow,
    Quotation,
    Approval,
    Notification,
)


class BaseRepository:
    """Base repository class containing the database session."""

    def __init__(self, db: Session) -> None:
        self.db = db


class CustomerRepository(BaseRepository):
    def get_by_id(self, customer_id: int) -> Optional[Customer]:
        return self.db.query(Customer).filter(Customer.id == customer_id).first()

    def get_by_email(self, email: str) -> Optional[Customer]:
        return self.db.query(Customer).filter(Customer.email == email).first()

    def get_all(self, limit: int = 100) -> List[Customer]:
        return self.db.query(Customer).limit(limit).all()

    def create(self, name: str, email: str, company: Optional[str] = None) -> Customer:
        customer = Customer(name=name, email=email, company=company)
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        return customer


class LeadRepository(BaseRepository):
    def get_by_id(self, lead_id: int) -> Optional[Lead]:
        return self.db.query(Lead).filter(Lead.id == lead_id).first()

    def get_all(self, limit: int = 100) -> List[Lead]:
        return self.db.query(Lead).order_by(Lead.created_at.desc()).limit(limit).all()

    def get_total_revenue(self) -> float:
        val = self.db.query(func.sum(Lead.value)).scalar()
        return float(val) if val else 0.0


class EmailRepository(BaseRepository):
    def get_by_id(self, email_id: int) -> Optional[Email]:
        return self.db.query(Email).filter(Email.id == email_id).first()

    def get_all(self, limit: int = 100) -> List[Email]:
        return (
            self.db.query(Email).order_by(Email.received_at.desc()).limit(limit).all()
        )

    def get_inbound_emails(self, limit: int = 100) -> List[Email]:
        return (
            self.db.query(Email)
            .filter(Email.direction == "INBOUND")
            .order_by(Email.received_at.desc())
            .limit(limit)
            .all()
        )


class WorkflowRepository(BaseRepository):
    def get_by_id(self, workflow_id: int) -> Optional[Workflow]:
        return self.db.query(Workflow).filter(Workflow.id == workflow_id).first()

    def get_all(self, limit: int = 100) -> List[Workflow]:
        return (
            self.db.query(Workflow)
            .order_by(Workflow.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_recent(self, limit: int = 5) -> List[Workflow]:
        return (
            self.db.query(Workflow)
            .order_by(Workflow.updated_at.desc())
            .limit(limit)
            .all()
        )

    def get_stats(self) -> dict:
        total = self.db.query(Workflow).count()
        running = self.db.query(Workflow).filter(Workflow.status == "RUNNING").count()
        pending = (
            self.db.query(Workflow)
            .filter(Workflow.status == "PENDING_APPROVAL")
            .count()
        )
        completed = (
            self.db.query(Workflow).filter(Workflow.status == "COMPLETED").count()
        )
        failed = self.db.query(Workflow).filter(Workflow.status == "FAILED").count()

        return {
            "total": total,
            "running": running,
            "pending_approval": pending,
            "completed": completed,
            "failed": failed,
        }


class QuotationRepository(BaseRepository):
    def get_by_id(self, quote_id: int) -> Optional[Quotation]:
        return self.db.query(Quotation).filter(Quotation.id == quote_id).first()

    def get_by_workflow_id(self, workflow_id: int) -> Optional[Quotation]:
        return (
            self.db.query(Quotation)
            .filter(Quotation.workflow_id == workflow_id)
            .first()
        )


class ApprovalRepository(BaseRepository):
    def get_by_id(self, approval_id: int) -> Optional[Approval]:
        return self.db.query(Approval).filter(Approval.id == approval_id).first()

    def get_all(self, limit: int = 100) -> List[Approval]:
        return (
            self.db.query(Approval)
            .order_by(Approval.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_pending_approvals(self) -> List[Approval]:
        return (
            self.db.query(Approval)
            .filter(Approval.status == "PENDING")
            .order_by(Approval.created_at.desc())
            .all()
        )


class NotificationRepository(BaseRepository):
    def get_all(self, limit: int = 100) -> List[Notification]:
        return (
            self.db.query(Notification)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_unread(self) -> List[Notification]:
        return (
            self.db.query(Notification)
            .filter(Notification.read == False)
            .order_by(Notification.created_at.desc())
            .all()
        )

    def get_unread_count(self) -> int:
        return self.db.query(Notification).filter(Notification.read == False).count()

    def mark_as_read(self, notification_id: int) -> Optional[Notification]:
        notif = (
            self.db.query(Notification)
            .filter(Notification.id == notification_id)
            .first()
        )
        if notif:
            notif.read = True
            self.db.commit()
            self.db.refresh(notif)
        return notif

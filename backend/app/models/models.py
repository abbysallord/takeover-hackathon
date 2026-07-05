from datetime import datetime
from typing import List, Optional, Any, Dict
from sqlalchemy import String, Text, Float, ForeignKey, DateTime, func, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    company: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    status: Mapped[str] = mapped_column(
        String(50), default="NEW"
    )  # NEW, CONTACTED, QUOTATION_SENT, WON, LOST
    value: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    customer: Mapped["Customer"] = relationship()


class Email(Base):
    __tablename__ = "emails"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    message_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sender: Mapped[str] = mapped_column(String(255))
    recipient: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    received_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    direction: Mapped[str] = mapped_column(String(20))  # INBOUND, OUTBOUND


class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email_id: Mapped[int] = mapped_column(ForeignKey("emails.id"), index=True)
    status: Mapped[str] = mapped_column(
        String(50), default="RUNNING"
    )  # RUNNING, PENDING_APPROVAL, COMPLETED, FAILED
    current_stage: Mapped[str] = mapped_column(String(50), default="EMAIL_RECEIVED")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    email: Mapped["Email"] = relationship()
    steps: Mapped[List["WorkflowStep"]] = relationship(
        "WorkflowStep", back_populates="workflow", cascade="all, delete-orphan"
    )
    quotation: Mapped[Optional["Quotation"]] = relationship(
        "Quotation", back_populates="workflow", uselist=False
    )
    approvals: Mapped[List["Approval"]] = relationship(
        "Approval", back_populates="workflow"
    )


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflows.id"), index=True)
    stage: Mapped[str] = mapped_column(
        String(50)
    )  # e.g., EMAIL_RECEIVED, RETRIEVE_PRICING
    status: Mapped[str] = mapped_column(
        String(50), default="PENDING"
    )  # PENDING, RUNNING, COMPLETED, FAILED
    input_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    output_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="steps")


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflows.id"), index=True)
    quote_number: Mapped[str] = mapped_column(String(100), unique=True)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    items: Mapped[List[Dict[str, Any]]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="quotation")


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflows.id"), index=True)
    quotation_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("quotations.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(50), default="PENDING"
    )  # PENDING, APPROVED, REJECTED
    approver: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggested_reply: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    workflow: Mapped["Workflow"] = relationship("Workflow", back_populates="approvals")
    quotation: Mapped[Optional["Quotation"]] = relationship("Quotation")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    workflow_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("workflows.id"), nullable=True
    )
    type: Mapped[str] = mapped_column(
        String(50)
    )  # EMAIL_RECEIVED, APPROVAL_REQUEST, SYSTEM_ERROR
    message: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_name: Mapped[str] = mapped_column(String(255))
    business_email: Mapped[str] = mapped_column(String(255))
    industry: Mapped[str] = mapped_column(String(100))
    gmail_connected: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    catalog_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pricing_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    google_redirect_uri: Mapped[Optional[str]] = mapped_column(String(255), default="http://localhost:8001/workspace/oauth-callback", nullable=True)
    google_client_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    google_client_secret: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    google_access_token: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    google_refresh_token: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    google_token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())


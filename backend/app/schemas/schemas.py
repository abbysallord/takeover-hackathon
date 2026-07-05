from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


# --- Customer Schemas ---
class CustomerBase(BaseModel):
    name: str = Field(..., description="Full name of the customer")
    email: str = Field(..., description="Email address of the customer")
    company: Optional[str] = Field(None, description="Company name")


class CustomerCreate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Lead Schemas ---
class LeadBase(BaseModel):
    status: str = Field(
        "NEW", description="CRM Status (NEW, CONTACTED, QUOTATION_SENT, WON, LOST)"
    )
    value: float = Field(0.0, description="Estimated deal value")


class LeadCreate(LeadBase):
    customer_id: int


class LeadResponse(LeadBase):
    id: int
    customer_id: int
    customer: Optional[CustomerResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Email Schemas ---
class EmailBase(BaseModel):
    sender: str
    recipient: str
    subject: str
    body: str
    direction: str = Field("INBOUND", description="INBOUND or OUTBOUND")


class EmailCreate(EmailBase):
    message_id: Optional[str] = None


class EmailResponse(EmailBase):
    id: int
    message_id: Optional[str] = None
    received_at: datetime

    class Config:
        from_attributes = True


# --- Quotation Schemas ---
class QuotationItem(BaseModel):
    product: str
    quantity: int
    unit_price: float
    total: float


class QuotationBase(BaseModel):
    quote_number: str
    total_amount: float
    items: List[QuotationItem]


class QuotationCreate(BaseModel):
    workflow_id: int
    quote_number: str
    total_amount: float
    items: List[QuotationItem]


class QuotationResponse(BaseModel):
    id: int
    workflow_id: int
    quote_number: str
    total_amount: float
    items: List[QuotationItem]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Approval Schemas ---
class ApprovalBase(BaseModel):
    status: str = Field(
        "PENDING", description="Approval status (PENDING, APPROVED, REJECTED)"
    )
    approver: Optional[str] = None
    notes: Optional[str] = None
    suggested_reply: Optional[str] = None


class ApprovalCreate(BaseModel):
    workflow_id: int
    quotation_id: Optional[int] = None


class ApprovalDecision(BaseModel):
    status: str = Field(..., description="APPROVED or REJECTED")
    approver: Optional[str] = Field("Manager", description="Name of the approver")
    notes: Optional[str] = Field(
        None, description="Reason for rejection or notes on approval"
    )


class ApprovalResponse(ApprovalBase):
    id: int
    workflow_id: int
    quotation_id: Optional[int] = None
    quotation: Optional[QuotationResponse] = None
    created_at: datetime
    decided_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Workflow Step Schemas ---
class WorkflowStepResponse(BaseModel):
    id: int
    workflow_id: int
    stage: str
    status: str
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Workflow Schemas ---
class WorkflowResponse(BaseModel):
    id: int
    email_id: int
    status: str
    current_stage: str
    created_at: datetime
    updated_at: datetime
    email: Optional[EmailResponse] = None
    steps: List[WorkflowStepResponse] = []
    quotation: Optional[QuotationResponse] = None
    approvals: List[ApprovalResponse] = []
    completed_stages: List[str] = []
    pending_stages: List[str] = []

    class Config:
        from_attributes = True


# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: int
    workflow_id: Optional[int] = None
    type: str
    message: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Dashboard Schemas ---
class DashboardStats(BaseModel):
    total_workflows: int
    running_workflows: int
    pending_approvals: int
    completed_workflows: int
    failed_workflows: int
    total_leads: int
    total_revenue: float
    unread_notifications: int
    emails_received: int
    quotes_generated: int
    avg_response_time_seconds: float
    estimated_time_saved_minutes: float
    avg_ai_confidence: float


class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_workflows: List[WorkflowResponse]
    recent_approvals: List[ApprovalResponse]
    recent_notifications: List[NotificationResponse]


# --- Analytics Schemas ---
class StageDuration(BaseModel):
    stage: str
    avg_duration_seconds: float


class DailyVolume(BaseModel):
    date: str
    count: int


class ProductVolume(BaseModel):
    product: str
    quantity: int
    revenue: float


class AnalyticsResponse(BaseModel):
    automation_rate: float = Field(
        ..., description="Percentage of workflows processed without errors"
    )
    average_resolution_time_seconds: float = Field(
        ..., description="Average time taken from email to completed"
    )
    total_workflows_count: int
    completed_workflows_count: int
    failed_workflows_count: int
    avg_stage_durations: List[StageDuration]
    daily_volumes: List[DailyVolume]
    top_products: List[ProductVolume]


# --- Workspace Schemas ---
class WorkspaceBase(BaseModel):
    company_name: str
    business_email: str
    industry: str
    gmail_connected: bool = False
    catalog_data: Optional[str] = None
    pricing_data: Optional[str] = None
    google_redirect_uri: Optional[str] = "http://localhost:8001/workspace/oauth-callback"
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_access_token: Optional[str] = None
    google_refresh_token: Optional[str] = None
    google_token_expires_at: Optional[datetime] = None


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceResponse(WorkspaceBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


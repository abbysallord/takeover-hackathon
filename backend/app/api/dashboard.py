from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.schemas.schemas import DashboardResponse, DashboardStats
from app.models.models import Workflow, WorkflowStep, Quotation
from app.repositories.repos import (
    WorkflowRepository,
    LeadRepository,
    ApprovalRepository,
    NotificationRepository,
)

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)) -> DashboardResponse:
    """Aggregates and returns summary statistics, notifications, and workflow histories."""
    wf_repo = WorkflowRepository(db)
    lead_repo = LeadRepository(db)
    app_repo = ApprovalRepository(db)
    notif_repo = NotificationRepository(db)

    # Calculate metrics
    wf_stats = wf_repo.get_stats()
    unread_notifs = notif_repo.get_unread_count()
    total_revenue = lead_repo.get_total_revenue()

    leads = lead_repo.get_all(limit=1000)
    total_leads = len(leads)

    # Compute custom dynamic SaaS KPIs
    emails_received = wf_stats["total"]
    quotes_generated = db.query(Quotation).count()
    
    completed_workflows = db.query(Workflow).filter(Workflow.status == "COMPLETED").all()
    if completed_workflows:
        total_time = 0.0
        for wf in completed_workflows:
            duration = (wf.updated_at - wf.created_at).total_seconds()
            total_time += duration
        avg_response_time = total_time / len(completed_workflows)
    else:
        avg_response_time = 0.0
        
    estimated_time_saved = len(completed_workflows) * 15.0  # 15 mins saved per completed workflow
    
    steps = db.query(WorkflowStep).all()
    confidences = []
    for step in steps:
        if step.input_data and isinstance(step.input_data, dict):
            conf = step.input_data.get("confidence")
            if conf is not None:
                confidences.append(float(conf))
    avg_confidence = sum(confidences) / len(confidences) if confidences else 1.0

    stats = DashboardStats(
        total_workflows=wf_stats["total"],
        running_workflows=wf_stats["running"],
        pending_approvals=wf_stats["pending_approval"],
        completed_workflows=wf_stats["completed"],
        failed_workflows=wf_stats["failed"],
        total_leads=total_leads,
        total_revenue=total_revenue,
        unread_notifications=unread_notifs,
        emails_received=emails_received,
        quotes_generated=quotes_generated,
        avg_response_time_seconds=round(avg_response_time, 1),
        estimated_time_saved_minutes=round(estimated_time_saved, 1),
        avg_ai_confidence=round(avg_confidence, 2)
    )

    # Fetch recent history items
    from app.api.workflows import populate_workflow_stages
    
    recent_workflows = wf_repo.get_recent(limit=5)
    for wf in recent_workflows:
        populate_workflow_stages(wf)
        
    recent_approvals = app_repo.get_all(limit=5)
    recent_notifications = notif_repo.get_all(limit=10)

    return DashboardResponse(
        stats=stats,
        recent_workflows=recent_workflows,
        recent_approvals=recent_approvals,
        recent_notifications=recent_notifications,
    )

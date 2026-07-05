from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.schemas.schemas import DashboardResponse, DashboardStats
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

    stats = DashboardStats(
        total_workflows=wf_stats["total"],
        running_workflows=wf_stats["running"],
        pending_approvals=wf_stats["pending_approval"],
        completed_workflows=wf_stats["completed"],
        failed_workflows=wf_stats["failed"],
        total_leads=total_leads,
        total_revenue=total_revenue,
        unread_notifications=unread_notifs,
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

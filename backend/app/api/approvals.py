from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.models.database import get_db, tenant_session_id, SessionLocal
from app.models.models import Workflow
from app.schemas.schemas import ApprovalResponse, ApprovalDecision
from app.repositories.repos import ApprovalRepository
from app.services.workflow_service import WorkflowService
from sqlalchemy import text

router = APIRouter(tags=["Approvals"])


def run_workflow_background(db_session_id: str, workflow_id: int):
    """Executes the heavy AI reasoning and email delivery loop asynchronously in a background thread."""
    token = tenant_session_id.set(db_session_id)
    db = SessionLocal()
    try:
        from app.core.config import settings
        if not settings.DATABASE_URL.startswith("sqlite") and db_session_id:
            db.execute(text(f"SET search_path TO session_{db_session_id}"))
            
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if workflow:
            from app.workflows.engine import WorkflowEngine
            engine = WorkflowEngine()
            engine.execute(db, workflow)
    except Exception as e:
        print(f"Error executing background workflow: {e}")
    finally:
        db.close()
        tenant_session_id.reset(token)


@router.get("/approvals", response_model=List[ApprovalResponse])
def get_approvals(
    status_filter: Optional[str] = None, db: Session = Depends(get_db)
) -> List[ApprovalResponse]:
    """Retrieves all quotation approval requests, optionally filtering by status."""
    repo = ApprovalRepository(db)
    approvals = repo.get_all()
    if status_filter:
        return [a for a in approvals if a.status.upper() == status_filter.upper()]
    return approvals


@router.post("/approvals/{id}", response_model=ApprovalResponse)
def decide_approval(
    id: int, 
    decision: ApprovalDecision, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> ApprovalResponse:
    """Submits a decision (APPROVED or REJECTED) for a pending quotation approval."""
    repo = ApprovalRepository(db)
    approval = repo.get_by_id(id)
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval request with ID {id} not found.",
        )

    if approval.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Approval request with ID {id} is already resolved as '{approval.status}'.",
        )

    approved = decision.status.upper() == "APPROVED"
    try:
        # Update database statuses synchronously
        approval.status = "APPROVED" if approved else "REJECTED"
        approval.notes = decision.notes
        approval.decided_at = datetime.now()
        
        if approved:
            approval.workflow.status = "RUNNING"
            approval.workflow.current_stage = "SEND_REPLY"
        else:
            approval.workflow.status = "FAILED"
            
        db.commit()

        if approved:
            # Trigger background runner to execute AI agents and send emails
            background_tasks.add_task(
                run_workflow_background,
                db_session_id=tenant_session_id.get(),
                workflow_id=approval.workflow_id
            )

        db.refresh(approval)
        return approval
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process approval decision: {str(e)}",
        )

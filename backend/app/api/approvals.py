from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.schemas.schemas import ApprovalResponse, ApprovalDecision
from app.repositories.repos import ApprovalRepository
from app.services.workflow_service import WorkflowService

router = APIRouter(tags=["Approvals"])


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
    id: int, decision: ApprovalDecision, db: Session = Depends(get_db)
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
    service = WorkflowService()
    try:
        # Resume or fail the workflow state machine
        service.handle_approval(
            db=db,
            workflow_id=approval.workflow_id,
            approved=approved,
            notes=decision.notes,
        )

        # Refresh database session state to fetch updated record fields (decided_at, notes, status)
        db.refresh(approval)
        return approval
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process approval decision: {str(e)}",
        )

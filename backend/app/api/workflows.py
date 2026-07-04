from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.schemas.schemas import WorkflowResponse, EmailCreate
from app.repositories.repos import WorkflowRepository
from app.services.workflow_service import WorkflowService

router = APIRouter(tags=["Workflows"])


@router.get("/workflows", response_model=List[WorkflowResponse])
def get_workflows(
    limit: int = 100, db: Session = Depends(get_db)
) -> List[WorkflowResponse]:
    """Retrieves all workflows, ordered by creation date."""
    repo = WorkflowRepository(db)
    return repo.get_all(limit=limit)


@router.get("/workflows/{id}", response_model=WorkflowResponse)
def get_workflow_by_id(id: int, db: Session = Depends(get_db)) -> WorkflowResponse:
    """Retrieves details of a specific workflow, including history stages, emails, and quotes."""
    repo = WorkflowRepository(db)
    workflow = repo.get_by_id(id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow with ID {id} not found.",
        )
    return workflow


@router.post(
    "/workflows/simulate",
    response_model=WorkflowResponse,
    status_code=status.HTTP_201_CREATED,
)
def simulate_workflow(
    email_data: EmailCreate, db: Session = Depends(get_db)
) -> WorkflowResponse:
    """Simulates receiving a customer email and triggers the autonomous workflow state machine."""
    service = WorkflowService()
    try:
        workflow = service.process_new_email(
            db=db,
            sender=email_data.sender,
            recipient=email_data.recipient,
            subject=email_data.subject,
            body=email_data.body,
        )
        return workflow
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute workflow simulation: {str(e)}",
        )

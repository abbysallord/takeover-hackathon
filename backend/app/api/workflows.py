from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import traceback

from app.models.database import get_db
from app.schemas.schemas import WorkflowResponse, EmailCreate, WorkflowStepResponse
from app.repositories.repos import WorkflowRepository
from app.services.workflow_service import WorkflowService

router = APIRouter(tags=["Workflows"])


# --- Additional API Schemas for Observability ---
class TraceStepResponse(BaseModel):
    stage: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: float
    reasoning: str
    tool: str
    args: Dict[str, Any]
    output: Dict[str, Any]
    confidence: float


class StepReasoningResponse(BaseModel):
    stage: str
    reasoning: str
    confidence: float


def populate_workflow_stages(workflow: Any) -> Any:
    """Helper to compute completed and pending stages in order for a workflow."""
    ALL_STAGES = [
        "EMAIL_RECEIVED",
        "RETRIEVE_PRICING",
        "CHECK_INVENTORY",
        "GENERATE_QUOTATION",
        "REQUEST_APPROVAL",
        "SEND_REPLY",
        "CREATE_LEAD",
        "SCHEDULE_FOLLOWUP",
        "COMPLETED"
    ]
    completed = [step.stage for step in workflow.steps if step.status == "COMPLETED"]
    # Maintain the logical execution order for UI progression
    completed_stages = [stage for stage in ALL_STAGES if stage in completed]
    pending_stages = [stage for stage in ALL_STAGES if stage not in completed_stages]
    
    workflow.completed_stages = completed_stages
    workflow.pending_stages = pending_stages
    return workflow


@router.get("/workflows", response_model=List[WorkflowResponse])
def get_workflows(
    limit: int = 100, db: Session = Depends(get_db)
) -> List[WorkflowResponse]:
    """Retrieves all workflows, complete with dynamic completed/pending timeline progress."""
    repo = WorkflowRepository(db)
    workflows = repo.get_all(limit=limit)
    for wf in workflows:
        populate_workflow_stages(wf)
    return workflows


@router.get("/workflows/{id}", response_model=WorkflowResponse)
def get_workflow_by_id(id: int, db: Session = Depends(get_db)) -> WorkflowResponse:
    """Retrieves details of a specific workflow, complete with dynamic completed/pending timeline progress."""
    repo = WorkflowRepository(db)
    workflow = repo.get_by_id(id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow with ID {id} not found.",
        )
    populate_workflow_stages(workflow)
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
        populate_workflow_stages(workflow)
        return workflow
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute workflow simulation: {str(e)}",
        )


@router.get("/workflows/{id}/trace", response_model=List[TraceStepResponse])
def get_workflow_trace(id: int, db: Session = Depends(get_db)) -> List[TraceStepResponse]:
    """Exposes a detailed machine-readable trace logs timeline of each tool executed in the workflow."""
    repo = WorkflowRepository(db)
    workflow = repo.get_by_id(id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow with ID {id} not found.",
        )

    trace_steps = []
    for step in workflow.steps:
        # Check inputs and outputs safely
        inp = step.input_data or {}
        out = step.output_data or {}

        # Calculate time durations
        if step.completed_at:
            duration = (step.completed_at - step.started_at).total_seconds()
        else:
            duration = (datetime.now() - step.started_at).total_seconds()

        trace_steps.append(
            TraceStepResponse(
                stage=step.stage,
                status=step.status,
                started_at=step.started_at,
                completed_at=step.completed_at,
                duration_seconds=round(duration, 3),
                reasoning=inp.get("reasoning", ""),
                tool=inp.get("tool", step.stage),
                args=inp.get("args", {}),
                output=out.get("tool_output", {}),
                confidence=inp.get("confidence", 1.0)
            )
        )
    return trace_steps


@router.get("/workflows/{id}/reasoning", response_model=List[StepReasoningResponse])
def get_workflow_reasoning(id: int, db: Session = Depends(get_db)) -> List[StepReasoningResponse]:
    """Exposes the AI reasoning thought trace and confidence level for each stage in the workflow."""
    repo = WorkflowRepository(db)
    workflow = repo.get_by_id(id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow with ID {id} not found.",
        )

    reasonings = []
    for step in workflow.steps:
        inp = step.input_data or {}
        reasoning = inp.get("reasoning")
        
        # Only list steps that have actual reasoning logged (e.g. LLM tool decisions)
        if reasoning:
            reasonings.append(
                StepReasoningResponse(
                    stage=step.stage,
                    reasoning=reasoning,
                    confidence=inp.get("confidence", 1.0)
                )
            )
    return reasonings


@router.post("/workflows/demo-run", response_model=WorkflowResponse)
def execute_demo_run(db: Session = Depends(get_db)) -> WorkflowResponse:
    """Executes a full end-to-end demo simulation: email -> RAG -> stock check -> quote -> approval gate -> auto-approving -> dispatch -> completed."""
    service = WorkflowService()
    try:
        # 1. Simulate customer email inquiry
        workflow = service.process_new_email(
            db=db,
            sender="tony@starkindustries.com",
            recipient="sales@company.com",
            subject="Requesting 120 units of Widget-B",
            body="Hi, Stark Industries needs to place a bulk order of 120 units of Widget B. Can you provide price quotes?"
        )
        
        # 2. Automatically approve the quotation if paused
        if workflow.status == "PENDING_APPROVAL":
            from app.models.models import Approval
            approval = db.query(Approval).filter(
                Approval.workflow_id == workflow.id, 
                Approval.status == "PENDING"
            ).first()
            
            if approval:
                approval.status = "APPROVED"
                approval.approver = "Demo Auto-Approver"
                approval.notes = "Approved automatically by end-to-end Demo Mode."
                approval.decided_at = datetime.now()
                db.commit()
                
                service.handle_approval(
                    db=db,
                    workflow_id=workflow.id,
                    approved=True,
                    notes="Approved automatically by end-to-end Demo Mode."
                )
                db.refresh(workflow)
                
        populate_workflow_stages(workflow)
        return workflow
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute end-to-end demo simulation: {str(e)}",
        )


@router.get("/workflows/email/{email_id}", response_model=Optional[WorkflowResponse])
def get_workflow_by_email_id(email_id: int, db: Session = Depends(get_db)) -> Optional[WorkflowResponse]:
    """Retrieves the workflow associated with a specific email ID, if any exists."""
    from app.models.models import Workflow
    workflow = db.query(Workflow).filter(Workflow.email_id == email_id).first()
    if not workflow:
        return None
    populate_workflow_stages(workflow)
    return workflow

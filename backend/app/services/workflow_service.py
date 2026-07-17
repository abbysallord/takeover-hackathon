from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import Workflow, Email
from app.workflows.engine import WorkflowEngine


class WorkflowService:
    """Service layer that interfaces with the state-machine execution engine."""

    def __init__(self) -> None:
        self.engine = WorkflowEngine()

    def process_new_email(
        self, db: Session, sender: str, recipient: str, subject: str, body: str, message_id: Optional[str] = None
    ) -> Workflow:
        """Saves a new inbound customer email and starts the corresponding autonomous workflow."""
        email = Email(
            sender=sender,
            recipient=recipient,
            subject=subject,
            body=body,
            direction="INBOUND",
            message_id=message_id,
        )
        db.add(email)
        db.commit()
        db.refresh(email)

        # Trigger state machine
        return self.engine.start_workflow(db, email.id)

    def handle_approval(
        self, db: Session, workflow_id: int, approved: bool, notes: Optional[str] = None
    ) -> Workflow:
        """Processes manager approval or rejection, resuming or failing the workflow."""
        return self.engine.resume_after_approval(db, workflow_id, approved, notes)

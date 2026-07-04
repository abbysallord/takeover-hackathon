from datetime import datetime
import json
import random
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.models import (
    Customer,
    Lead,
    Email,
    Workflow,
    WorkflowStep,
    Quotation,
    Approval,
)
from app.tools.inventory import InventoryTool
from app.tools.pricing import PricingTool
from app.tools.crm import CRMTool
from app.tools.email import EmailTool
from app.tools.calendar import CalendarTool
from app.tools.notification import NotificationTool
from app.agents.planner import MockAgentPlanner
from app.core.provider import llm_provider
from app.workflows.state import STAGES


class WorkflowEngine:
    """Orchestrator that handles executing, pausing, and resuming sales operations workflows."""

    def __init__(self) -> None:
        self.inventory_tool = InventoryTool()
        self.pricing_tool = PricingTool()
        self.crm_tool = CRMTool()
        self.email_tool = EmailTool()
        self.calendar_tool = CalendarTool()
        self.notification_tool = NotificationTool()
        self.planner = MockAgentPlanner(provider=llm_provider)

    def start_workflow(self, db: Session, email_id: int) -> Workflow:
        """Initializes a new workflow from an inbound email and triggers execution."""
        workflow = Workflow(
            email_id=email_id,
            status="RUNNING",
            current_stage="EMAIL_RECEIVED",
        )
        db.add(workflow)
        db.commit()
        db.refresh(workflow)

        self.execute(db, workflow)
        return workflow

    def resume_after_approval(
        self, db: Session, workflow_id: int, approved: bool, notes: Optional[str] = None
    ) -> Workflow:
        """Resumes workflow from SEND_REPLY upon approval, or marks as FAILED on rejection."""
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            raise ValueError(f"Workflow with ID {workflow_id} not found.")

        # Resolve latest pending approval record
        approval = (
            db.query(Approval)
            .filter(Approval.workflow_id == workflow_id, Approval.status == "PENDING")
            .order_by(Approval.created_at.desc())
            .first()
        )

        if approval:
            approval.status = "APPROVED" if approved else "REJECTED"
            approval.notes = notes
            approval.decided_at = datetime.now()
            db.commit()

        if approved:
            # Transition workflow status back to running and advance stage
            workflow.status = "RUNNING"
            workflow.current_stage = "SEND_REPLY"
            db.commit()

            # Execute the remaining steps of the workflow
            self.execute(db, workflow)
        else:
            # Workflow rejected by manager
            workflow.status = "FAILED"
            db.commit()

            # Log the failed approval step in history
            step = WorkflowStep(
                workflow_id=workflow.id,
                stage="REQUEST_APPROVAL",
                status="FAILED",
                input_data={"approval_id": approval.id if approval else None},
                output_data={"status": "REJECTED", "reason": notes},
                started_at=datetime.now(),
                completed_at=datetime.now(),
            )
            db.add(step)

            # Publish a notification explaining rejection
            self.notification_tool.publish_notification(
                db=db,
                notification_type="SYSTEM_ERROR",
                message=f"Workflow #{workflow.id} rejected by manager: {notes or 'No details provided.'}",
                workflow_id=workflow.id,
            )
            db.commit()

        return workflow

    def execute(self, db: Session, workflow: Workflow) -> None:
        """Executes the workflow stages starting from its current stage."""
        start_idx = STAGES.index(workflow.current_stage)

        for stage in STAGES[start_idx:]:
            if workflow.status != "RUNNING":
                break

            workflow.current_stage = stage
            db.commit()

            # Create workflow step tracking record
            step = WorkflowStep(
                workflow_id=workflow.id,
                stage=stage,
                status="RUNNING",
                started_at=datetime.now(),
            )
            db.add(step)
            db.commit()
            db.refresh(step)

            try:
                # Run the actual step handler
                input_data, output_data = self._run_stage(db, workflow, stage)

                step.status = "COMPLETED"
                step.input_data = input_data
                step.output_data = output_data
                step.completed_at = datetime.now()
                db.commit()

                # If the step was REQUEST_APPROVAL, we pause execution
                if stage == "REQUEST_APPROVAL":
                    workflow.status = "PENDING_APPROVAL"
                    db.commit()
                    break

            except Exception as e:
                # Set step status to failed and store the error traceback message
                step.status = "FAILED"
                step.error_message = str(e)
                step.completed_at = datetime.now()

                # Set parent workflow status to failed
                workflow.status = "FAILED"
                db.commit()

                # Trigger dashboard system alert
                self.notification_tool.publish_notification(
                    db=db,
                    notification_type="SYSTEM_ERROR",
                    message=f"Workflow #{workflow.id} failed at stage {stage}: {str(e)}",
                    workflow_id=workflow.id,
                )
                db.commit()
                break

    def _run_stage(
        self, db: Session, workflow: Workflow, stage: str
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Handles state execution for a specific workflow stage."""
        email = workflow.email

        if stage == "EMAIL_RECEIVED":
            inp = {"email_id": email.id}
            out = {
                "sender": email.sender,
                "recipient": email.recipient,
                "subject": email.subject,
                "body_snippet": email.body[:150] + "..."
                if len(email.body) > 150
                else email.body,
                "received_at": email.received_at.isoformat(),
            }
            return inp, out

        elif stage == "UNDERSTAND_REQUEST":
            inp = {"email_body": email.body}
            out = self.planner.plan(email.body)
            return inp, out

        elif stage == "EXTRACT_INFORMATION":
            # Retrieve output from UNDERSTAND_REQUEST
            prev_step = (
                db.query(WorkflowStep)
                .filter(
                    WorkflowStep.workflow_id == workflow.id,
                    WorkflowStep.stage == "UNDERSTAND_REQUEST",
                )
                .first()
            )
            planner_out = (
                prev_step.output_data if (prev_step and prev_step.output_data) else {}
            )
            extracted = planner_out.get("extracted_info", {})
            product = extracted.get("product", "Widget A")
            quantity = extracted.get("quantity", 100)

            # Customer lookup/creation
            sender_email = email.sender
            customer = db.query(Customer).filter(Customer.email == sender_email).first()
            if not customer:
                name_part = sender_email.split("@")[0].title()
                customer = Customer(
                    name=name_part, email=sender_email, company="Inquired Company Inc."
                )
                db.add(customer)
                db.commit()
                db.refresh(customer)

            inp = {"planner_output": planner_out, "sender_email": sender_email}
            out = {
                "customer_id": customer.id,
                "customer_name": customer.name,
                "product": product,
                "quantity": quantity,
                "confidence": extracted.get("confidence", 0.95),
            }
            return inp, out

        elif stage == "RETRIEVE_PRICING":
            prev_step = (
                db.query(WorkflowStep)
                .filter(
                    WorkflowStep.workflow_id == workflow.id,
                    WorkflowStep.stage == "EXTRACT_INFORMATION",
                )
                .first()
            )
            info = (
                prev_step.output_data if (prev_step and prev_step.output_data) else {}
            )
            product = info.get("product", "Widget A")
            quantity = info.get("quantity", 100)

            pricing = self.pricing_tool.get_pricing(product, quantity)
            inp = {"product": product, "quantity": quantity}
            out = pricing
            return inp, out

        elif stage == "CHECK_INVENTORY":
            prev_step = (
                db.query(WorkflowStep)
                .filter(
                    WorkflowStep.workflow_id == workflow.id,
                    WorkflowStep.stage == "EXTRACT_INFORMATION",
                )
                .first()
            )
            info = (
                prev_step.output_data if (prev_step and prev_step.output_data) else {}
            )
            product = info.get("product", "Widget A")
            quantity = info.get("quantity", 100)

            stock = self.inventory_tool.check_stock(product, quantity)
            inp = {"product": product, "quantity": quantity}
            out = stock
            return inp, out

        elif stage == "GENERATE_QUOTATION":
            # Retrieve pricing result
            pricing_step = (
                db.query(WorkflowStep)
                .filter(
                    WorkflowStep.workflow_id == workflow.id,
                    WorkflowStep.stage == "RETRIEVE_PRICING",
                )
                .first()
            )
            pricing_info = (
                pricing_step.output_data
                if (pricing_step and pricing_step.output_data)
                else {}
            )

            quote_number = f"QT-2026-{random.randint(10000, 99999)}"
            total_amount = pricing_info.get("total_amount", 1000.0)
            product_name = pricing_info.get("product_name", "Widget A")
            quantity = pricing_info.get("quantity", 100)
            unit_price = pricing_info.get("unit_price", 10.0)

            items_list = [
                {
                    "product": product_name,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total": total_amount,
                }
            ]

            quote = Quotation(
                workflow_id=workflow.id,
                quote_number=quote_number,
                total_amount=total_amount,
                items=items_list,
            )
            db.add(quote)
            db.commit()
            db.refresh(quote)

            inp = {"pricing_info": pricing_info}
            out = {
                "quotation_id": quote.id,
                "quote_number": quote_number,
                "total_amount": total_amount,
                "items": items_list,
            }
            return inp, out

        elif stage == "REQUEST_APPROVAL":
            quote = (
                db.query(Quotation).filter(Quotation.workflow_id == workflow.id).first()
            )
            if not quote:
                raise ValueError("Cannot request approval without a quotation.")

            approval = Approval(
                workflow_id=workflow.id,
                quotation_id=quote.id,
                status="PENDING",
            )
            db.add(approval)
            db.commit()
            db.refresh(approval)

            # Send a notification dashboard alert
            self.notification_tool.publish_approval_request(
                db=db,
                workflow_id=workflow.id,
                quotation_number=quote.quote_number,
                amount=quote.total_amount,
            )

            inp = {"quotation_id": quote.id}
            out = {
                "approval_id": approval.id,
                "status": "PENDING",
                "quote_number": quote.quote_number,
                "total_amount": quote.total_amount,
            }
            return inp, out

        elif stage == "SEND_REPLY":
            quote = (
                db.query(Quotation).filter(Quotation.workflow_id == workflow.id).first()
            )
            quote_number = quote.quote_number if quote else "QT-UNKNOWN"
            amount = quote.total_amount if quote else 0.0

            email_body = (
                f"Hello,\n\nThank you for reaching out to us. We have processed your inquiry "
                f"and generated quotation {quote_number} for a total of ${amount:,.2f}.\n\n"
                f"Please review the attached invoice. Our standard delivery takes 2 business days.\n\n"
                f"Best regards,\nAI Sales Operations Team"
            )

            dispatch = self.email_tool.send_email(
                to_email=email.sender,
                subject=f"RE: {email.subject}",
                body=email_body,
                attachment_name=f"{quote_number}.pdf",
            )

            # Log outbound email record
            outbound = Email(
                sender=email.recipient,
                recipient=email.sender,
                subject=f"RE: {email.subject}",
                body=email_body,
                direction="OUTBOUND",
            )
            db.add(outbound)
            db.commit()

            inp = {"recipient": email.sender, "quote_number": quote_number}
            out = {
                "outbound_email_id": outbound.id,
                "message_id": dispatch.get("message_id"),
                "status": "SENT",
            }
            return inp, out

        elif stage == "CREATE_LEAD":
            info_step = (
                db.query(WorkflowStep)
                .filter(
                    WorkflowStep.workflow_id == workflow.id,
                    WorkflowStep.stage == "EXTRACT_INFORMATION",
                )
                .first()
            )
            info = (
                info_step.output_data if (info_step and info_step.output_data) else {}
            )
            customer_id = info.get("customer_id")
            customer_name = info.get("customer_name", "Valued Client")

            quote = (
                db.query(Quotation).filter(Quotation.workflow_id == workflow.id).first()
            )
            total_amount = quote.total_amount if quote else 0.0

            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            company = customer.company if customer else "Inquired Company"
            cust_email = customer.email if customer else email.sender

            # Register in CRM
            crm_res = self.crm_tool.create_or_update_lead(
                customer_name=customer_name,
                email=cust_email,
                company=company,
                value=total_amount,
            )

            # Insert lead into local DB
            lead = Lead(
                customer_id=customer_id, status="QUALIFIED_LEAD", value=total_amount
            )
            db.add(lead)
            db.commit()

            inp = {"customer_id": customer_id, "deal_value": total_amount}
            out = {"lead_id": lead.id, "crm_sync": crm_res}
            return inp, out

        elif stage == "SCHEDULE_FOLLOWUP":
            event = self.calendar_tool.schedule_followup(
                customer_email=email.sender,
                title=f"Follow up on Quote - {email.sender}",
            )
            inp = {"customer_email": email.sender}
            out = event
            return inp, out

        elif stage == "COMPLETED":
            inp = {}
            out = {
                "status": "COMPLETED",
                "completed_at": datetime.now().isoformat() + "Z",
                "summary": "Completed sales operations workflow end-to-end.",
            }

            workflow.status = "COMPLETED"
            db.commit()

            # Publish completed workflow success notification
            self.notification_tool.publish_notification(
                db=db,
                notification_type="EMAIL_RECEIVED",
                message=f"Workflow #{workflow.id} completed for {email.sender}.",
                workflow_id=workflow.id,
            )
            db.commit()
            return inp, out

        return {}, {}

from datetime import datetime
import json
import random
import re
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
    Workspace,
)
from app.tools.inventory import InventoryTool
from app.tools.pricing import PricingTool
from app.tools.crm import CRMTool
from app.tools.email import EmailTool
from app.tools.calendar import CalendarTool
from app.tools.notification import NotificationTool
from app.tools.whatsapp import WhatsAppTool
from app.core.provider import llm_provider
from app.services.rag_service import rag_service
from app.prompts.templates import AGENT_ORCHESTRATOR_SYSTEM_PROMPT


def clean_html_to_plain_text(html_content: str) -> str:
    """Strips HTML tags, script, and style blocks to yield clean plain text."""
    if not html_content:
        return ""
    # Remove script and style elements
    text = re.sub(r"<(script|style)\b[^>]*>([\s\S]*?)<\/\1>", "", html_content, flags=re.I)
    # Remove all HTML tags
    text = re.sub(r"<[^>]+>", "", text)
    # Replace multiple spaces/newlines with single ones
    text = re.sub(r"\n\s*\n", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


class WorkflowEngine:
    """Autonomous sales workflow execution engine.

    Uses an LLM agentic loop to select tools, observe results, log details, and advance workflow state.
    """

    def __init__(self) -> None:
        self.inventory_tool = InventoryTool()
        self.pricing_tool = PricingTool()
        self.crm_tool = CRMTool()
        self.email_tool = EmailTool()
        self.calendar_tool = CalendarTool()
        self.notification_tool = NotificationTool()
        self.whatsapp_tool = WhatsAppTool()
        self.llm_provider = llm_provider
        self.rag_service = rag_service

    def start_workflow(self, db: Session, email_id: int) -> Workflow:
        """Initializes a new workflow from an inbound email and runs the agent loop."""
        workflow = Workflow(
            email_id=email_id,
            status="RUNNING",
            current_stage="EMAIL_RECEIVED",
        )
        db.add(workflow)
        db.commit()
        db.refresh(workflow)

        # Log initial inbound email step
        step_received = WorkflowStep(
            workflow_id=workflow.id,
            stage="EMAIL_RECEIVED",
            status="COMPLETED",
            input_data={"email_id": email_id},
            output_data={"status": "RECEIVED", "timestamp": datetime.now().isoformat()},
            started_at=datetime.now(),
            completed_at=datetime.now(),
        )
        db.add(step_received)
        db.commit()

        # Execute agent loop
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
            # Transition workflow status back to running and resume loop
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
        """Runs the autonomous agent loop, calling the LLM to decide on actions and tools."""
        email = workflow.email
        
        # Max steps safety guardrail
        MAX_STEPS = 12
        step_count = db.query(WorkflowStep).filter(WorkflowStep.workflow_id == workflow.id).count()
        
        while workflow.status == "RUNNING":
            if step_count >= MAX_STEPS:
                self._fail_workflow(
                    db, 
                    workflow, 
                    f"Safety Guardrail: Execution step limit reached ({MAX_STEPS}). Aborting potential loop."
                )
                break
                
            # 1. Compile execution history
            history_steps = self._compile_history(db, workflow)
            
            # 2. Format the orchestrator prompt
            body_text = clean_html_to_plain_text(email.body)
            prompt = AGENT_ORCHESTRATOR_SYSTEM_PROMPT.format(
                sender=email.sender,
                subject=email.subject,
                body=body_text,
                history_steps=history_steps if history_steps else "None. Starting execution."
            )
            
            # 3. Call LLM Provider to determine next action
            start_time = datetime.now()
            try:
                response_text = self.llm_provider.generate(prompt, temperature=0.1)
                decision = self._parse_decision(response_text)
            except Exception as e:
                self._fail_workflow(db, workflow, f"LLM Decision Generation Failed: {str(e)}")
                break
                
            tool_name = decision.get("tool")
            tool_args = decision.get("args", {})
            reasoning = decision.get("thought", "")
            confidence = decision.get("confidence", 1.0)
            
            if not tool_name:
                self._fail_workflow(db, workflow, "LLM returned empty tool selection.")
                break
                
            # 4. Map tool to standard workflow stage
            stage_name = self._map_tool_to_stage(tool_name)
            workflow.current_stage = stage_name
            db.commit()
            
            # 5. Record step starting in database
            step = WorkflowStep(
                workflow_id=workflow.id,
                stage=stage_name,
                status="RUNNING",
                input_data={
                    "reasoning": reasoning,
                    "tool": tool_name,
                    "args": tool_args,
                    "confidence": confidence
                },
                started_at=start_time
            )
            db.add(step)
            db.commit()
            db.refresh(step)
            
            step_count += 1
            
            # 6. Execute selected tool
            try:
                tool_output = self._execute_tool(db, workflow, tool_name, tool_args)
                
                # Update step to completed
                step.status = "COMPLETED"
                step.output_data = {"tool_output": tool_output}
                step.completed_at = datetime.now()
                db.commit()
                
                # 7. Check transitions
                if tool_name == "request_approval_tool":
                    workflow.status = "PENDING_APPROVAL"
                    db.commit()
                    break
                elif tool_name == "complete_workflow_tool":
                    workflow.status = "COMPLETED"
                    db.commit()
                    break
                    
            except Exception as e:
                db.rollback()
                try:
                    step.status = "FAILED"
                    step.error_message = str(e)
                    step.completed_at = datetime.now()
                    db.commit()
                except Exception:
                    db.rollback()
                
                self._fail_workflow(db, workflow, f"Tool '{tool_name}' failed: {str(e)}")
                break

    def _execute_tool(self, db: Session, workflow: Workflow, tool_name: str, tool_args: Dict[str, Any]) -> Dict[str, Any]:
        """Executes a specific tool action and returns a dictionary response."""
        if tool_name == "rag_tool":
            query = tool_args.get("query", "")
            context = self.rag_service.get_formatted_context(query)
            return {"context": context}
            
        elif tool_name == "inventory_tool":
            product = tool_args.get("product", "")
            quantity = tool_args.get("quantity", 1)
            return self.inventory_tool.check_stock(db, product, quantity)
            
        elif tool_name == "pricing_tool":
            product = tool_args.get("product", "")
            quantity = tool_args.get("quantity", 1)
            return self.pricing_tool.get_pricing(db, product, quantity)
            
        elif tool_name == "generate_quote_tool":
            product_name = tool_args.get("product_name", "Widget A")
            quantity = tool_args.get("quantity", 100)
            unit_price = tool_args.get("unit_price", 10.0)
            total_amount = tool_args.get("total_amount", 1000.0)
            
            quote_number = f"QT-2026-{random.randint(10000, 99999)}"
            items_list = [{
                "product": product_name,
                "quantity": quantity,
                "unit_price": unit_price,
                "total": total_amount
            }]
            
            quote = Quotation(
                workflow_id=workflow.id,
                quote_number=quote_number,
                total_amount=total_amount,
                items=items_list
            )
            db.add(quote)
            db.commit()
            db.refresh(quote)
            
            return {
                "quotation_id": quote.id,
                "quote_number": quote_number,
                "total_amount": total_amount,
                "items": items_list
            }
            
        elif tool_name == "request_approval_tool":
            quote_number = tool_args.get("quotation_number", "")
            amount = tool_args.get("amount", 0.0)
            
            quote = db.query(Quotation).filter(Quotation.workflow_id == workflow.id).first()
            quote_id = quote.id if quote else None
            
            # Generate the suggested email body dynamically using the LLM provider
            customer_name = "Valued Customer"
            to_email = workflow.email.sender
            
            # Clean customer name extraction
            if workflow.email.sender:
                import re
                name_match = re.match(r"^([^<@]+)", workflow.email.sender)
                if name_match:
                    customer_name = name_match.group(1).strip()
            
            # Fetch products and quantity details from the quotation
            product_desc = "products"
            quantity_desc = 0
            total_val = amount
            if quote and quote.items:
                items = quote.items
                product_desc = ", ".join([item.get("product", "product") for item in items])
                quantity_desc = sum([item.get("quantity", 0) for item in items])
            
            try:
                from app.prompts.templates import EMAIL_REPLY_GENERATOR_PROMPT
                prompt_reply = EMAIL_REPLY_GENERATOR_PROMPT.format(
                    customer_name=customer_name,
                    to_email=to_email,
                    product=product_desc,
                    quantity=quantity_desc,
                    total_amount=total_val,
                    currency="USD",
                    quote_number=quote_number
                )
                suggested_reply = self.llm_provider.generate(prompt_reply, temperature=0.1)
                suggested_reply = suggested_reply.strip()
            except Exception as ex:
                print(f"⚠️ Failed to generate suggested reply for workflow approval: {ex}")
                suggested_reply = f"Hi {customer_name},\n\nWe have prepared quotation {quote_number} for your request of {product_desc}.\n\nTotal: ${total_val:,.2f}.\n\nBest regards,\nSales Operations Manager"
            
            approval = Approval(
                workflow_id=workflow.id,
                quotation_id=quote_id,
                status="PENDING",
                suggested_reply=suggested_reply
            )
            db.add(approval)
            db.commit()
            db.refresh(approval)
            
            self.notification_tool.publish_approval_request(
                db=db,
                workflow_id=workflow.id,
                quotation_number=quote_number,
                amount=amount
            )
            return {
                "approval_id": approval.id,
                "status": "PENDING"
            }
            
        elif tool_name == "email_tool":
            body = tool_args.get("body", "")
            
            # Load the exact approved draft response if available
            approval = (
                db.query(Approval)
                .filter(Approval.workflow_id == workflow.id, Approval.status == "APPROVED")
                .order_by(Approval.decided_at.desc())
                .first()
            )
            if approval and approval.suggested_reply:
                body = approval.suggested_reply

            to_email = workflow.email.sender  # Force real sender to prevent placeholder email hallucinations
            subject = tool_args.get("subject", f"RE: {workflow.email.subject}")
            
            workspace = db.query(Workspace).first()
            if workspace and workspace.gmail_connected and workspace.google_refresh_token:
                try:
                    from app.services.gmail_sync_service import send_gmail_email_sync
                    res = send_gmail_email_sync(db, workspace, to_email, subject, body)
                    print(f"📧 Real Gmail sent to {to_email} successfully!")
                except Exception as e:
                    print(f"⚠️ Failed to send real Gmail: {e}. Falling back to simulator.")
                    res = self.email_tool.send_email(
                        to_email=to_email,
                        subject=subject,
                        body=body
                    )
            else:
                res = self.email_tool.send_email(
                    to_email=to_email,
                    subject=subject,
                    body=body
                )
            
            outbound = Email(
                sender=workflow.email.recipient if workspace else "sales@company.com",
                recipient=to_email,
                subject=subject,
                body=body,
                direction="OUTBOUND"
            )
            db.add(outbound)
            db.commit()
            return res
            
        elif tool_name == "crm_tool":
            customer_name = tool_args.get("customer_name", "Valued Customer")
            email = workflow.email.sender  # Force real sender to prevent placeholder email hallucinations
            company = tool_args.get("company", "Company Inc.")
            value = tool_args.get("value", 0.0)
            
            customer = db.query(Customer).filter(Customer.email == email).first()
            if not customer:
                customer = Customer(name=customer_name, email=email, company=company)
                db.add(customer)
                db.commit()
                db.refresh(customer)
                
            crm_res = self.crm_tool.create_or_update_lead(
                customer_name=customer_name,
                email=email,
                company=company,
                value=value
            )
            
            lead = Lead(
                customer_id=customer.id,
                status="QUOTATION_SENT",
                value=value
            )
            db.add(lead)
            db.commit()
            
            return {
                "lead_id": lead.id,
                "crm_sync": crm_res
            }
            
        elif tool_name == "calendar_tool":
            customer_email = workflow.email.sender  # Force real sender to prevent placeholder email hallucinations
            title = tool_args.get("title", "Follow up call")
            days_from_now = tool_args.get("days_from_now", 3)
            
            return self.calendar_tool.schedule_followup(customer_email, title, days_from_now)
            
        elif tool_name == "whatsapp_tool":
            phone = tool_args.get("phone", "")
            message = tool_args.get("message", "")
            return self.whatsapp_tool.send_notification(phone, message)
            
        elif tool_name == "complete_workflow_tool":
            # Check if an outbound reply was sent
            outbound = db.query(Email).filter(Email.direction == "OUTBOUND", Email.recipient == workflow.email.sender).first()
            if outbound:
                workflow.email.classification = "VALID_LEAD"
            else:
                workflow.email.classification = "IGNORED_NON_LEAD"
            
            # Flush changes to email classification
            db.commit()
            
            return {"status": "SUCCESS", "message": "Workflow marked completed successfully."}
            
        else:
            raise ValueError(f"Unknown tool name: {tool_name}")

    def _compile_history(self, db: Session, workflow: Workflow) -> str:
        """Loads previous steps and formats them as a readable string history for the LLM context."""
        history = ""
        past_steps = (
            db.query(WorkflowStep)
            .filter(WorkflowStep.workflow_id == workflow.id)
            .order_by(WorkflowStep.started_at.asc())
            .all()
        )
        
        for step in past_steps:
            if step.status == "COMPLETED":
                inp = step.input_data or {}
                out = step.output_data or {}
                
                tool = inp.get("tool", step.stage)
                reasoning = inp.get("reasoning", "")
                args = inp.get("args", {})
                result = out.get("tool_output", {})
                
                history += (
                    f"- Tool: {tool}\n"
                    f"  Reasoning: {reasoning}\n"
                    f"  Arguments: {args}\n"
                    f"  Result: {result}\n\n"
                )
                
        # Append manager approval decisions if they exist
        approval = (
            db.query(Approval)
            .filter(Approval.workflow_id == workflow.id)
            .order_by(Approval.created_at.desc())
            .first()
        )
        if approval and approval.status != "PENDING":
            history += (
                f"- Action: Manager Review\n"
                f"  Result: {approval.status}\n"
                f"  Notes: {approval.notes or 'None'}\n"
                f"  Decided At: {approval.decided_at.isoformat() if approval.decided_at else 'unknown'}\n\n"
            )
            
        return history

    def _parse_decision(self, response_text: str) -> Dict[str, Any]:
        """Extracts and parses JSON structures from LLM outputs robustly."""
        # 1. Try to find markdown code blocks
        code_blocks = re.findall(r"```(?:json)?\s*([\s\S]*?)\s*```", response_text)
        if code_blocks:
            # Try to parse code blocks, starting from the last one (usually contains the final output)
            for block in reversed(code_blocks):
                try:
                    block_clean = re.sub(r",\s*([\]}])", r"\1", block.strip())
                    return json.loads(block_clean)
                except Exception:
                    pass

        # 2. Try to find the outermost valid JSON structure by trying all '{'
        clean_text = response_text.strip()
        start_indices = [m.start() for m in re.finditer(r"{", clean_text)]
        for start in start_indices:
            end = clean_text.rfind("}")
            while end > start:
                substring = clean_text[start:end+1]
                try:
                    sub_clean = re.sub(r",\s*([\]}])", r"\1", substring)
                    return json.loads(sub_clean)
                except Exception:
                    end = clean_text.rfind("}", start, end)

        # 3. Fallback: old simple method (raise error if fails)
        try:
            clean_text = response_text.strip()
            clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text, flags=re.MULTILINE)
            clean_text = re.sub(r"\s*```$", "", clean_text, flags=re.MULTILINE)
            clean_text = clean_text.strip()
            start = clean_text.find("{")
            end = clean_text.rfind("}")
            if start != -1 and end != -1:
                clean_text = clean_text[start:end+1]
            fixed_text = re.sub(r",\s*([\]}])", r"\1", clean_text)
            return json.loads(fixed_text)
        except Exception as e:
            raise ValueError(f"Failed to parse structured JSON from LLM: {response_text}. Error: {e}")

    def _map_tool_to_stage(self, tool_name: str) -> str:
        """Maps tool names to standard dashboard timeline stages."""
        mapping = {
            "rag_tool": "RETRIEVE_PRICING",
            "inventory_tool": "CHECK_INVENTORY",
            "pricing_tool": "RETRIEVE_PRICING",
            "generate_quote_tool": "GENERATE_QUOTATION",
            "request_approval_tool": "REQUEST_APPROVAL",
            "email_tool": "SEND_REPLY",
            "crm_tool": "CREATE_LEAD",
            "calendar_tool": "SCHEDULE_FOLLOWUP",
            "whatsapp_tool": "WHATSAPP_FOLLOWUP",
            "complete_workflow_tool": "COMPLETED",
        }
        return mapping.get(tool_name, "UNDERSTAND_REQUEST")

    def _fail_workflow(self, db: Session, workflow: Workflow, error_message: str) -> None:
        """Transitions parent workflow status to FAILED and publishes a notification alert."""
        workflow.status = "FAILED"
        db.commit()
        
        self.notification_tool.publish_notification(
            db=db,
            notification_type="SYSTEM_ERROR",
            message=error_message,
            workflow_id=workflow.id
        )
        db.commit()

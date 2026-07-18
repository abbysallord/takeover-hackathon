from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import Inventory, Approval
from app.api.approvals import run_workflow_background
from app.models.database import tenant_session_id
from datetime import datetime
from typing import Dict, Any

router = APIRouter(prefix="/mcp", tags=["MCP"])

@router.get("/tools")
def list_tools():
    """Lists available tools for MCP compliance."""
    return {
        "tools": [
            {
                "name": "get_inventory",
                "description": "Retrieve current inventory details, including SKU, names, and stock levels.",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "list_pending_approvals",
                "description": "Fetch all pending manager approvals for high-value sales quotations.",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "approve_or_reject_quote",
                "description": "Approve or reject a pending quotation by its approval ID.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "approval_id": {"type": "integer", "description": "The unique ID of the approval request."},
                        "decision": {"type": "string", "enum": ["APPROVED", "REJECTED"], "description": "APPROVED to release the quote and email the client, REJECTED to cancel."}
                    },
                    "required": ["approval_id", "decision"]
                }
            }
        ]
    }

@router.post("/tools/call")
async def call_tool(
    payload: Dict[str, Any], 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    """Executes a tool call for MCP compliance."""
    name = payload.get("name")
    arguments = payload.get("arguments", {})

    if not name:
        raise HTTPException(status_code=400, detail="Missing tool name")

    try:
        if name == "get_inventory":
            items = db.query(Inventory).all()
            result = []
            for item in items:
                result.append(f"SKU: {item.sku} | Name: {item.product_name} | Stock: {item.current_stock}")
            return {
                "content": [
                    {
                        "type": "text",
                        "text": "\n".join(result) if result else "Inventory is empty."
                    }
                ]
            }

        elif name == "list_pending_approvals":
            approvals = db.query(Approval).filter(Approval.status == "PENDING").all()
            result = []
            for app in approvals:
                result.append(
                    f"ID: {app.id} | Quotation: {app.quotation.quotation_number if app.quotation else 'N/A'} | "
                    f"Amount: ${app.amount:.2f} | Reasoning: {app.reasoning}"
                )
            return {
                "content": [
                    {
                        "type": "text",
                        "text": "\n".join(result) if result else "No pending approvals found."
                    }
                ]
            }

        elif name == "approve_or_reject_quote":
            approval_id = arguments.get("approval_id")
            decision = arguments.get("decision")
            if not approval_id or not decision:
                raise HTTPException(status_code=400, detail="Missing approval_id or decision")

            approval = db.query(Approval).filter(Approval.id == approval_id).first()
            if not approval:
                return {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Error: Approval request with ID {approval_id} not found."
                        }
                    ],
                    "isError": True
                }

            if approval.status != "PENDING":
                return {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Error: Approval request {approval_id} is already resolved as '{approval.status}'."
                        }
                    ],
                    "isError": True
                }

            approved = decision.upper() == "APPROVED"
            
            # Update database statuses synchronously
            approval.status = "APPROVED" if approved else "REJECTED"
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

            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"Success: Quotation approval ID {approval_id} has been marked as {decision}. Background email worker triggered."
                    }
                ]
            }

        else:
            raise HTTPException(status_code=404, detail=f"Tool {name} not found")

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"Error executing tool {name}: {str(e)}"
                }
            ],
            "isError": True
        }

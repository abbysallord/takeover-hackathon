from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import Quotation
from app.schemas.schemas import QuotationResponse

router = APIRouter(tags=["Quotations"])


@router.get("/quotations", response_model=List[QuotationResponse])
def get_quotations(limit: int = 100, db: Session = Depends(get_db)) -> List[QuotationResponse]:
    """Retrieves all generated quotations in the database."""
    return db.query(Quotation).order_by(Quotation.created_at.desc()).limit(limit).all()


@router.get("/quotations/{id}", response_model=QuotationResponse)
def get_quotation_by_id(id: int, db: Session = Depends(get_db)) -> QuotationResponse:
    """Retrieves details of a specific quotation by ID."""
    quotation = db.query(Quotation).filter(Quotation.id == id).first()
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {id} not found.",
        )
    return quotation


@router.post("/quotations/{id}/send")
async def send_quotation(id: int, db: Session = Depends(get_db)):
    """Sends the quotation email to the customer via the connected sales inbox."""
    from app.models.models import Workflow, Email, Workspace
    
    quotation = db.query(Quotation).filter(Quotation.id == id).first()
    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quotation with ID {id} not found.",
        )
        
    # Get associated workflow and customer email
    workflow = db.query(Workflow).filter(Workflow.id == quotation.workflow_id).first()
    if not workflow or not workflow.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No customer email thread associated with this quotation.",
        )
        
    customer_email = workflow.email.sender
    subject = f"Sales Quote: {quotation.quote_number}"
    
    # Formulate email reply
    items_summary = "\n".join([
        f"- {item.get('product')}: {item.get('quantity')} units @ ${item.get('unit_price')} (Total: ${item.get('total')})"
        for item in (quotation.items or [])
    ])
    
    reply_body = (
        f"Hello,\n\n"
        f"Following up on your request, please find the details of your quotation {quotation.quote_number} below:\n\n"
        f"{items_summary}\n\n"
        f"Grand Total: ${quotation.total_amount:,.2f}\n\n"
        f"If you have any questions or would like to proceed with the order, please reply to this email thread.\n\n"
        f"Best regards,\n"
        f"Sales Operations Team"
    )
    
    workspace = db.query(Workspace).first()
    if workspace and workspace.gmail_connected and workspace.google_refresh_token:
        try:
            from app.services.gmail_sync_service import send_gmail_email
            await send_gmail_email(db, workspace, customer_email, subject, reply_body)
            
            # Log this as an outbound email in database
            outbound = Email(
                sender=workspace.business_email,
                recipient=customer_email,
                subject=subject,
                body=reply_body,
                direction="OUTBOUND"
            )
            db.add(outbound)
            db.commit()
            
            return {"success": True, "message": f"Quotation {quotation.quote_number} sent successfully to {customer_email}."}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send email via Gmail API: {str(e)}",
            )
    else:
        # Sandbox simulator response
        outbound = Email(
            sender="sales@company.com",
            recipient=customer_email,
            subject=subject,
            body=reply_body,
            direction="OUTBOUND"
        )
        db.add(outbound)
        db.commit()
        return {"success": True, "message": f"[Sandbox Mode] Quotation {quotation.quote_number} simulated delivery to {customer_email}."}

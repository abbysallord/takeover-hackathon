from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import Lead, Customer
from app.schemas.schemas import LeadResponse, LeadCreate

router = APIRouter(tags=["Leads"])


class StatusUpdate(BaseModel):
    status: str


@router.get("/leads", response_model=List[LeadResponse])
def get_leads(limit: int = 100, db: Session = Depends(get_db)) -> List[LeadResponse]:
    """Retrieves list of all CRM Leads in the database."""
    return db.query(Lead).order_by(Lead.created_at.desc()).limit(limit).all()


@router.post("/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(data: LeadCreate, db: Session = Depends(get_db)) -> LeadResponse:
    """Manually creates a new CRM Lead."""
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {data.customer_id} does not exist.",
        )
    lead = Lead(customer_id=data.customer_id, status=data.status, value=data.value)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/leads/{id}/status", response_model=LeadResponse)
def update_lead_status(
    id: int, data: StatusUpdate, db: Session = Depends(get_db)
) -> LeadResponse:
    """Updates the CRM Lead status (e.g. WON, LOST, CONTACTED)."""
    lead = db.query(Lead).filter(Lead.id == id).first()
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with ID {id} not found.",
        )
    lead.status = data.status
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/leads/{id}", status_code=status.HTTP_200_OK)
def delete_lead(id: int, db: Session = Depends(get_db)):
    """Deletes a CRM Lead from the database."""
    lead = db.query(Lead).filter(Lead.id == id).first()
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lead with ID {id} not found.",
        )
    db.delete(lead)
    db.commit()
    return {"success": True, "message": f"Lead with ID {id} deleted successfully."}

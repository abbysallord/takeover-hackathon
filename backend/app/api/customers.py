from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import Customer
from app.schemas.schemas import CustomerResponse, CustomerCreate

router = APIRouter(tags=["Customers"])


@router.get("/customers", response_model=List[CustomerResponse])
def get_customers(limit: int = 100, db: Session = Depends(get_db)) -> List[CustomerResponse]:
    """Retrieves all customers registered in the workspace."""
    return db.query(Customer).order_by(Customer.created_at.desc()).limit(limit).all()


@router.post("/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)) -> CustomerResponse:
    """Registers a new Customer in the workspace."""
    # Ensure email is unique
    existing = db.query(Customer).filter(Customer.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A customer with this email address already exists.",
        )
    customer = Customer(name=data.name, email=data.email, company=data.company)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

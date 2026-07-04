from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.schemas.schemas import EmailResponse
from app.repositories.repos import EmailRepository

router = APIRouter(tags=["Emails"])


@router.get("/emails", response_model=List[EmailResponse])
def get_emails(limit: int = 100, db: Session = Depends(get_db)) -> List[EmailResponse]:
    """Retrieves list of parsed customer emails (inbound and outbound)."""
    repo = EmailRepository(db)
    return repo.get_all(limit=limit)


@router.get("/emails/{id}", response_model=EmailResponse)
def get_email_by_id(id: int, db: Session = Depends(get_db)) -> EmailResponse:
    """Retrieves full details of a specific email by its ID."""
    repo = EmailRepository(db)
    email = repo.get_by_id(id)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email with ID {id} not found.",
        )
    return email

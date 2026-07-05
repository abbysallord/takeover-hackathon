import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.models import Workspace
from app.schemas.schemas import WorkspaceCreate, WorkspaceResponse

router = APIRouter(tags=["Workspace"])


@router.get("/workspace", response_model=Optional[WorkspaceResponse])
def get_workspace(db: Session = Depends(get_db)) -> Optional[WorkspaceResponse]:
    """Retrieves the active workspace setup configuration, if initialized."""
    workspace = db.query(Workspace).first()
    return workspace


@router.post("/workspace/setup", response_model=WorkspaceResponse)
def setup_workspace(
    data: WorkspaceCreate, db: Session = Depends(get_db)
) -> WorkspaceResponse:
    """Initializes or updates the workspace configurations.

    Automatically writes uploaded catalogs to the local knowledge base and triggers RAG re-indexing.
    """
    workspace = db.query(Workspace).first()
    
    if workspace:
        # Update existing config
        workspace.company_name = data.company_name
        workspace.business_email = data.business_email
        workspace.industry = data.industry
        workspace.gmail_connected = data.gmail_connected
        workspace.catalog_data = data.catalog_data
        workspace.pricing_data = data.pricing_data
    else:
        # Create fresh workspace record
        workspace = Workspace(
            company_name=data.company_name,
            business_email=data.business_email,
            industry=data.industry,
            gmail_connected=data.gmail_connected,
            catalog_data=data.catalog_data,
            pricing_data=data.pricing_data,
        )
        db.add(workspace)
        
    db.commit()
    db.refresh(workspace)
    
    # Save the uploaded documents directly into the RAG directory structure
    try:
        if data.catalog_data:
            os.makedirs("knowledge/products", exist_ok=True)
            with open("knowledge/products/catalog.md", "w", encoding="utf-8") as f:
                f.write(data.catalog_data)
                
        if data.pricing_data:
            os.makedirs("knowledge/pricing", exist_ok=True)
            with open("knowledge/pricing/sheets.md", "w", encoding="utf-8") as f:
                f.write(data.pricing_data)
                
        # Force the RAG service to re-index files on the next retrieval query
        from app.services.rag_service import rag_service
        rag_service._is_initialized = False
        
    except Exception as e:
        print(f"⚠️ Failed to write workspace documents to RAG knowledge base: {e}")
        
    return workspace

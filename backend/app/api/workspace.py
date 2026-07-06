from datetime import datetime, timedelta
import os
import traceback
import httpx
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.database import get_db
from app.models.models import Workspace
from app.schemas.schemas import WorkspaceCreate, WorkspaceResponse
from app.services.gmail_sync_service import exchange_auth_code

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
        workspace.onboarding_completed = data.onboarding_completed
        if data.google_client_id:
            workspace.google_client_id = data.google_client_id
        if data.google_client_secret:
            workspace.google_client_secret = data.google_client_secret
        if data.google_redirect_uri:
            workspace.google_redirect_uri = data.google_redirect_uri
    else:
        # Create fresh workspace record
        workspace = Workspace(
            company_name=data.company_name,
            business_email=data.business_email,
            industry=data.industry,
            gmail_connected=data.gmail_connected,
            catalog_data=data.catalog_data,
            pricing_data=data.pricing_data,
            google_client_id=data.google_client_id,
            google_client_secret=data.google_client_secret,
            google_redirect_uri=data.google_redirect_uri,
            onboarding_completed=data.onboarding_completed,
        )
        db.add(workspace)
        
    db.commit()
    db.refresh(workspace)
    
    # Save the uploaded documents directly into the RAG directory structure
    try:
        from app.services.rag_service import rag_service
        root = rag_service.knowledge_root
        
        if data.catalog_data:
            os.makedirs(root / "products", exist_ok=True)
            with open(root / "products/catalog.md", "w", encoding="utf-8") as f:
                f.write(data.catalog_data)
                
        if data.pricing_data:
            os.makedirs(root / "pricing", exist_ok=True)
            with open(root / "pricing/sheets.md", "w", encoding="utf-8") as f:
                f.write(data.pricing_data)
                
        # Force the RAG service to re-index files on the next retrieval query
        rag_service._is_initialized = False
        
    except Exception as e:
        print(f"⚠️ Failed to write workspace documents to RAG knowledge base: {e}")
        
    return workspace


@router.get("/workspace/auth-url")
def get_auth_url(request: Request, db: Session = Depends(get_db)):
    """Generates the Google OAuth authorization URL to initiate sign-in flow."""
    # Capture the session_id to pass inside the OAuth state parameter
    session_id = request.headers.get("x-session-id")
    if not session_id:
        session_id = request.query_params.get("session_id")

    workspace = db.query(Workspace).first()
    client_id = (
        (workspace.google_client_id)
        if (workspace and workspace.google_client_id)
        else settings.GOOGLE_CLIENT_ID
    )

    redirect_uri = (
        workspace.google_redirect_uri
        if (workspace and workspace.google_redirect_uri)
        else "http://localhost:8001/workspace/oauth-callback"
    )
    scope = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email"

    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        "&response_type=code"
        f"&scope={scope}"
        "&access_type=offline"
        "&prompt=consent"
    )
    if session_id:
        auth_url += f"&state={session_id}"
        
    return {"auth_url": auth_url}


@router.get("/workspace/oauth-callback")
async def oauth_callback(code: str, state: Optional[str] = None, db: Session = Depends(get_db)):
    """Handles the redirect from Google OAuth consent screen."""
    if state:
        from app.models.database import tenant_session_id, INITIALIZED_SCHEMAS
        from app.models.models import Base
        from sqlalchemy import text
        session_id = "".join(c for c in state if c.isalnum() or c in ("-", "_")).lower()
        session_id = session_id[:50]
        tenant_session_id.set(session_id)
        
        # Set search path and ensure tables exist in target schema
        db.execute(text(f"SET search_path TO session_{session_id}"))
        db.commit()
        
        if session_id not in INITIALIZED_SCHEMAS:
            conn = db.connection()
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS session_{session_id}"))
            conn.execute(text(f"SET search_path TO session_{session_id}"))
            Base.metadata.create_all(bind=conn)
            db.commit()
            INITIALIZED_SCHEMAS.add(session_id)

    workspace = db.query(Workspace).first()
    if not workspace:
        # Create a default workspace record to hold connection info
        workspace = Workspace(
            company_name="AI Workspace",
            business_email="sales@company.com",
            industry="Technology",
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)

    client_id = (
        workspace.google_client_id
        or settings.GOOGLE_CLIENT_ID
    )
    client_secret = (
        workspace.google_client_secret or settings.GOOGLE_CLIENT_SECRET
    )
    redirect_uri = workspace.google_redirect_uri or "http://localhost:8001/workspace/oauth-callback"

    try:
        token_data = await exchange_auth_code(
            code, client_id, client_secret, redirect_uri
        )
        workspace.gmail_connected = True
        workspace.google_access_token = token_data["access_token"]
        workspace.google_refresh_token = token_data.get(
            "refresh_token", workspace.google_refresh_token
        )
        workspace.google_token_expires_at = datetime.now() + timedelta(
            seconds=token_data["expires_in"]
        )

        # Retrieve connected Gmail address
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        async with httpx.AsyncClient() as client:
            info_res = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo", headers=headers
            )
            if info_res.status_code == 200:
                workspace.business_email = info_res.json().get(
                    "email", workspace.business_email
                )

        db.commit()
        # Redirect back to the frontend: if catalog exists, redirect to settings; else to onboarding
        # Redirect back to the frontend: if catalog exists, redirect to settings; else to onboarding
        if workspace.catalog_data:
            redirect_url = f"{settings.FRONTEND_URL}/dashboard/settings?gmail_connected=true"
        else:
            redirect_url = f"{settings.FRONTEND_URL}/onboarding?gmail_connected=true"
        return RedirectResponse(url=redirect_url)
    except Exception as e:
        traceback.print_exc()
        if workspace and workspace.catalog_data:
            redirect_url = f"{settings.FRONTEND_URL}/dashboard/settings?error={str(e)}"
        else:
            redirect_url = f"{settings.FRONTEND_URL}/onboarding?error={str(e)}"
        return RedirectResponse(url=redirect_url)


@router.post("/workspace/complete")
def complete_onboarding(db: Session = Depends(get_db)):
    """Marks onboarding as completed for the active workspace."""
    workspace = db.query(Workspace).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="No workspace found to complete onboarding")
    workspace.onboarding_completed = True
    db.commit()
    db.refresh(workspace)
    return {"status": "success", "onboarding_completed": True}


@router.post("/workspace/reset")
def reset_workspace(db: Session = Depends(get_db)):
    """Wipes the active workspace configuration and resets all data (acting as a sign out / system reset)."""
    from app.models.models import (
        Workspace, Email, Workflow, WorkflowStep, 
        Quotation, Lead, Customer, Approval, Notification
    )
    # Clear transactions first due to foreign keys if any, then parents
    db.query(WorkflowStep).delete()
    db.query(Approval).delete()
    db.query(Quotation).delete()
    db.query(Lead).delete()
    db.query(Notification).delete()
    db.query(Workflow).delete()
    db.query(Email).delete()
    db.query(Customer).delete()
    db.query(Workspace).delete()
    db.commit()

    # Purge tenant dynamic knowledge folder and reset dynamic RAG service caches
    from app.services.rag_service import rag_service
    from app.models.database import tenant_session_id
    import shutil
    sid = tenant_session_id.get()
    
    if sid in rag_service.documents_by_session:
        rag_service.documents_by_session[sid] = []
    if sid in rag_service.initialized_sessions:
        rag_service.initialized_sessions[sid] = False
        
    try:
        tenant_path = rag_service.knowledge_root
        if tenant_path.exists() and tenant_path.is_dir():
            shutil.rmtree(tenant_path)
    except Exception as e:
        print(f"Error purging tenant dynamic knowledge path: {e}")

    return {"success": True, "message": "Workspace profile and all workspace transaction data reset successfully."}


@router.get("/workspace/credentials-defaults")
def get_credentials_defaults(request: Request):
    """Returns the configured client ID, secret, and dynamic redirect URI defaults."""
    # Determine the backend base URL dynamically from request headers
    base_url = str(request.base_url).rstrip('/')
    default_redirect = f"{base_url}/workspace/oauth-callback"
    return {
        "client_id": settings.GOOGLE_CLIENT_ID or "",
        "client_secret": settings.GOOGLE_CLIENT_SECRET or "",
        "redirect_uri": default_redirect
    }

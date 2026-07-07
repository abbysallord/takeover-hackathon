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
    
    import hashlib
    if workspace:
        # Update existing config
        workspace.company_name = data.company_name
        workspace.business_email = data.business_email
        workspace.industry = data.industry
        workspace.gmail_connected = data.gmail_connected
        workspace.catalog_data = data.catalog_data
        workspace.pricing_data = data.pricing_data
        workspace.onboarding_completed = data.onboarding_completed
        if data.passcode:
            workspace.passcode_hash = hashlib.sha256(data.passcode.encode("utf-8")).hexdigest()
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
            passcode_hash=hashlib.sha256(data.passcode.encode("utf-8")).hexdigest() if data.passcode else None
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

    if workspace and workspace.google_redirect_uri:
        redirect_uri = workspace.google_redirect_uri
    else:
        base_url = str(request.base_url).rstrip('/')
        if not any(x in base_url for x in ("localhost", "127.0.0.1")):
            if base_url.startswith("http://"):
                base_url = "https://" + base_url[7:]
        redirect_uri = f"{base_url}/workspace/oauth-callback"

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
async def oauth_callback(
    request: Request,
    code: Optional[str] = None, 
    error: Optional[str] = None,
    state: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    """Handles the redirect from Google OAuth consent screen."""
    try:
        workspace = db.query(Workspace).first()
    except Exception as e:
        import urllib.parse
        error_msg = urllib.parse.quote(f"DB Error: {str(e)}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/onboarding?error={error_msg}")

    if error or not code:
        err_msg = error or "missing_code"
        if workspace and workspace.catalog_data:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/dashboard/settings?error={err_msg}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/onboarding?error={err_msg}")
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
    
    if workspace and workspace.google_redirect_uri:
        redirect_uri = workspace.google_redirect_uri
    else:
        base_url = str(request.base_url).rstrip('/')
        if not any(x in base_url for x in ("localhost", "127.0.0.1")):
            if base_url.startswith("http://"):
                base_url = "https://" + base_url[7:]
        redirect_uri = f"{base_url}/workspace/oauth-callback"

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

        # Store the boolean flag before commit to prevent lazy-loading after transaction is closed
        has_catalog = bool(workspace.catalog_data)
        db.commit()
        
        # Redirect back to the frontend: if catalog exists, redirect to settings; else to onboarding
        if has_catalog:
            redirect_url = f"{settings.FRONTEND_URL}/dashboard/settings?gmail_connected=true"
        else:
            redirect_url = f"{settings.FRONTEND_URL}/onboarding?gmail_connected=true"
        return RedirectResponse(url=redirect_url)
    except Exception as e:
        traceback.print_exc()
        import urllib.parse
        error_msg = urllib.parse.quote(str(e))
        has_catalog = bool(workspace.catalog_data) if workspace else False
        if has_catalog:
            redirect_url = f"{settings.FRONTEND_URL}/dashboard/settings?error={error_msg}"
        else:
            redirect_url = f"{settings.FRONTEND_URL}/onboarding?error={error_msg}"
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
    # Force HTTPS for public domains to comply with Google's OAuth security policies
    if not any(x in base_url for x in ("localhost", "127.0.0.1")):
        if base_url.startswith("http://"):
            base_url = "https://" + base_url[7:]
            
    default_redirect = f"{base_url}/workspace/oauth-callback"
    return {
        "client_id": settings.GOOGLE_CLIENT_ID or "",
        "client_secret": settings.GOOGLE_CLIENT_SECRET or "",
        "redirect_uri": default_redirect
    }


from pydantic import BaseModel

class ResumeRequest(BaseModel):
    slug: str
    passcode: str


@router.get("/workspace/check-slug/{slug}")
def check_slug(slug: str, db: Session = Depends(get_db)):
    """Checks if a workspace schema name is already taken."""
    from sqlalchemy import text
    clean_slug = "".join(c for c in slug if c.isalnum() or c in ("-", "_")).lower()
    
    # Exclude reserved words and names
    if clean_slug in ("public", "information_schema", "pg_catalog", "pg_toast"):
        return {"available": False}
        
    if not settings.DATABASE_URL.startswith("sqlite"):
        try:
            # 1. Check if schema exists
            res = db.execute(text("SELECT schema_name FROM information_schema.schemata WHERE schema_name = :s"), {"s": f"session_{clean_slug}"})
            schema_exists = len(res.fetchall()) > 0
            if not schema_exists:
                return {"available": True}
                
            # 2. Schema exists, check if workspaces table exists and is onboarded
            table_check = db.execute(text(
                "SELECT FROM information_schema.tables WHERE table_schema = :s AND table_name = 'workspaces'"
            ), {"s": f"session_{clean_slug}"})
            table_exists = len(table_check.fetchall()) > 0
            if not table_exists:
                return {"available": True}
                
            # 3. Workspaces table exists, query onboarding_completed status
            onboarded_check = db.execute(text(f"SELECT onboarding_completed FROM session_{clean_slug}.workspaces LIMIT 1"))
            rows = onboarded_check.fetchall()
            if len(rows) > 0 and rows[0][0] is True:
                return {"available": False} # Schema is fully onboarded and active!
            
            return {"available": True} # Schema exists but is un-onboarded draft
        except Exception as e:
            print(f"Error checking slug schema availability: {e}")
            return {"available": True}
    else:
        import os
        exists = os.path.exists(f"session_{clean_slug}.db")
        if not exists:
            return {"available": True}
            
        # SQLite db file exists, check if workspaces table exists and is completed
        try:
            from sqlalchemy import create_engine
            temp_engine = create_engine(f"sqlite:///session_{clean_slug}.db")
            with temp_engine.connect() as conn:
                table_check = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='workspaces'"))
                if len(table_check.fetchall()) > 0:
                    onboarded_check = conn.execute(text("SELECT onboarding_completed FROM workspaces LIMIT 1"))
                    rows = onboarded_check.fetchall()
                    if len(rows) > 0 and rows[0][0] in (True, 1):
                        return {"available": False}
        except Exception as e:
            print(f"Error checking SQLite slug availability: {e}")
            
        return {"available": True}


@router.post("/workspace/resume")
def resume_workspace(data: ResumeRequest, db: Session = Depends(get_db)):
    """Validates the security passcode for a dynamic tenant schema."""
    workspace = db.query(Workspace).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace session not found.")
        
    if not workspace.passcode_hash:
        # If no passcode was set (legacy), allow entry
        return {"status": "success", "session_id": data.slug}
        
    import hashlib
    hashed_entered = hashlib.sha256(data.passcode.encode("utf-8")).hexdigest()
    if workspace.passcode_hash != hashed_entered:
        raise HTTPException(status_code=401, detail="Invalid security passcode.")
        
    return {"status": "success", "session_id": data.slug}

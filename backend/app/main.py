import asyncio
import sys

# Ensure stdout uses UTF-8 to prevent crash when printing emojis on Windows
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import Base, engine, SessionLocal, DATABASE_URL, tenant_session_id
from app.services.seed_service import seed_database
from app.api import (
    health_router,
    dashboard_router,
    emails_router,
    workflows_router,
    approvals_router,
    analytics_router,
    workspace_router,
    leads_router,
    customers_router,
    quotations_router,
    notifications_router,
    knowledge_router,
    inventory_router,
)


async def gmail_polling_task():
    """Background task to poll Gmail inbox periodically for all tenant workspaces."""
    print("🚀 Background Gmail inbox sync manager started.")
    from app.services.gmail_sync_service import poll_gmail_inbox
    from sqlalchemy import text, create_engine
    import glob
    import asyncio

    while True:
        try:
            # We must poll all active tenant workspaces
            tenant_sessions = []
            
            # Find PostgreSQL schemas
            if not DATABASE_URL.startswith("sqlite"):
                temp_db = SessionLocal()
                try:
                    res = temp_db.execute(text("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'session_%'"))
                    tenant_sessions = [row[0][8:] for row in res.fetchall()]
                except Exception as e:
                    print(f"Error querying schemas: {e}")
                finally:
                    temp_db.close()
            # Find SQLite files
            else:
                db_files = glob.glob("session_*.db")
                tenant_sessions = [f[8:-3] for f in db_files]

            async def poll_tenant(tenant):
                # Alphanumeric check to safeguard query
                clean_tenant = "".join(c for c in tenant if c.isalnum() or c in ("-", "_")).lower()
                token = tenant_session_id.set(clean_tenant)
                try:
                    if DATABASE_URL.startswith("sqlite"):
                        from sqlalchemy.orm import sessionmaker
                        temp_engine = create_engine(f"sqlite:///session_{clean_tenant}.db", connect_args={"check_same_thread": False})
                        TempSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=temp_engine)
                        db = TempSessionLocal()
                        try:
                            await poll_gmail_inbox(db)
                        finally:
                            db.close()
                    else:
                        db = SessionLocal()
                        try:
                            # Run schema column migrations for older workspaces in background
                            from app.models.database import INITIALIZED_SCHEMAS, migrate_schema_columns
                            if clean_tenant not in INITIALIZED_SCHEMAS:
                                migrate_schema_columns(db, clean_tenant)
                                INITIALIZED_SCHEMAS.add(clean_tenant)
                                
                            db.execute(text(f"SET search_path TO session_{clean_tenant}"))
                            await poll_gmail_inbox(db)
                        except Exception as e:
                            print(f"Error polling tenant session_{clean_tenant}: {e}")
                        finally:
                            db.close()
                finally:
                    try:
                        tenant_session_id.reset(token)
                    except ValueError:
                        pass

            # If there are no sessions yet, poll the default database just in case
            if not tenant_sessions:
                db = SessionLocal()
                try:
                    await poll_gmail_inbox(db)
                finally:
                    db.close()
            else:
                # Run polling loops concurrently but throttled to avoid database connection spikes
                sem = asyncio.Semaphore(3)
                async def safe_poll(t):
                    async with sem:
                        try:
                            await asyncio.wait_for(poll_tenant(t), timeout=15.0)
                        except Exception as ex:
                            print(f"Error checking tenant {t}: {ex}")

                await asyncio.gather(*(safe_poll(t) for t in tenant_sessions), return_exceptions=True)
        except Exception as e:
            print(f"⚠️ Exception in Gmail polling task: {e}")
        # Poll inbox every 60 seconds to prevent database connection exhaustion
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Handles startup and shutdown events for database setup and seeding."""
    
    is_sqlite = DATABASE_URL.startswith("sqlite")
    
    if is_sqlite:
        # SQLite local dev: create tables and run seed in one connection
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            from sqlalchemy import text, inspect
            from app.models.models import Workspace
            try:
                inspector = inspect(engine)
                with engine.begin() as conn:
                    # Migrate workspaces
                    existing_workspace_cols = {col['name'] for col in inspector.get_columns('workspaces')}
                    for column in Workspace.__table__.columns:
                        col_name = column.name
                        if col_name not in existing_workspace_cols:
                            col_type = str(column.type)
                            sqlite_def = "BOOLEAN DEFAULT FALSE" if col_name in ("onboarding_completed", "gmail_connected") else col_type
                            if "VARCHAR" in col_type.upper() or "TEXT" in col_type.upper():
                                sqlite_def = "TEXT"
                            try:
                                conn.execute(text(f"ALTER TABLE workspaces ADD COLUMN {col_name} {sqlite_def};"))
                            except Exception:
                                pass
                    # Migrate emails
                    from app.models.models import Email
                    existing_email_cols = {col['name'] for col in inspector.get_columns('emails')}
                    for column in Email.__table__.columns:
                        col_name = column.name
                        if col_name not in existing_email_cols:
                            try:
                                conn.execute(text(f"ALTER TABLE emails ADD COLUMN {col_name} TEXT;"))
                            except Exception:
                                pass
                print("Successfully verified all columns exist in SQLite database.")
            except Exception as e:
                print(f"⚠️ Migration warning: {e}")
            
            seed_database(db)
        finally:
            db.close()
    else:
        # PostgreSQL (Supabase): schemas are created on-demand per tenant via get_db.
        # Skipping create_all and seed at startup to avoid consuming connection pool slots
        # before we even accept traffic — which causes EMAXCONNSESSION on rolling deploys.
        print("PostgreSQL mode: skipping startup schema creation. Tenant schemas are created on first request.")

    # Spawn background polling task in a dedicated thread to prevent blocking Uvicorn's main event loop
    import threading
    
    def run_polling_loop():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(gmail_polling_task())
        except Exception as e:
            print(f"⚠️ Exception in polling thread: {e}")
        finally:
            loop.close()

    polling_thread = threading.Thread(target=run_polling_loop, daemon=True)
    polling_thread.start()

    try:
        yield
    finally:
        # Daemon thread automatically terminates on process exit
        pass


app = FastAPI(
    title="AI Sales Operations Manager API",
    description="FastAPI Backend for Autonomous Sales Operations Workflow orchestration.",
    version="1.0.0",
    lifespan=lifespan,
)

# Custom middleware to extract X-Session-ID header and store it in tenant_session_id contextvar
from fastapi import Request
from app.models.database import tenant_session_id

@app.middleware("http")
async def tenant_session_middleware(request: Request, call_next):
    session_id = request.headers.get("x-session-id")
    if not session_id:
        session_id = request.query_params.get("session_id")
        
    # Handle OAuth callback state param
    if not session_id and request.url.path == "/workspace/oauth-callback":
        session_id = request.query_params.get("state")
        if session_id and session_id.startswith("session_"):
            # Strip the 'session_' prefix if present so we don't double prefix it
            session_id = session_id[8:]
        
    if session_id:
        if session_id.startswith("session_"):
            session_id = session_id[8:]
        session_id = "".join(c for c in session_id if c.isalnum() or c in ("-", "_")).lower()
        session_id = session_id[:50]
        
    token = tenant_session_id.set(session_id)
    try:
        response = await call_next(request)
        return response
    finally:
        try:
            tenant_session_id.reset(token)
        except ValueError:
            pass

# Enable permissive CORS for seamless hackathon local frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://flow.hackarena.dev",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=[
        "X-Session-ID",
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
)

# Mount API routers directly to match target path mappings
app.include_router(health_router)
app.include_router(dashboard_router)
app.include_router(emails_router)
app.include_router(workflows_router)
app.include_router(approvals_router)
app.include_router(analytics_router)
app.include_router(workspace_router)
app.include_router(leads_router)
app.include_router(customers_router)
app.include_router(quotations_router)
app.include_router(notifications_router)
app.include_router(knowledge_router)
app.include_router(inventory_router)


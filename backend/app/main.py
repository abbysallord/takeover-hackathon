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
                # Sequentially poll active tenant sessions to prevent database connection spikes
                for t in tenant_sessions:
                    try:
                        # Wrap each polling action in a timeout to prevent blocking other tenants
                        await asyncio.wait_for(poll_tenant(t), timeout=10.0)
                    except Exception as poll_ex:
                        print(f"Error checking tenant {t}: {poll_ex}")
                    # Add breathing space between connections
                    await asyncio.sleep(0.5)
        except Exception as e:
            print(f"⚠️ Exception in Gmail polling task: {e}")
        # Poll inbox every 60 seconds
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Handles startup and shutdown events for database setup and seeding."""
    # Create SQLite database tables if they do not exist
    Base.metadata.create_all(bind=engine)

    # Run dynamic dialect-agnostic alter statement for workspaces columns
    try:
        from sqlalchemy import text, inspect
        from app.models.models import Workspace
        with engine.begin() as conn:
            inspector = inspect(engine)
            # Fetch existing columns from the database workspaces table
            existing_columns = {col['name'] for col in inspector.get_columns('workspaces')}
            
            # Auto-detect and migrate any columns defined in model but missing in database
            for column in Workspace.__table__.columns:
                col_name = column.name
                if col_name not in existing_columns:
                    col_type = str(column.type)
                    # Determine appropriate definitions for SQLite and Postgres dialects
                    if col_name in ("onboarding_completed", "gmail_connected"):
                        sqlite_def = "BOOLEAN DEFAULT FALSE"
                        pg_def = "BOOLEAN DEFAULT FALSE"
                    elif "VARCHAR" in col_type.upper():
                        sqlite_def = col_type
                        pg_def = col_type
                    elif "TEXT" in col_type.upper():
                        sqlite_def = "TEXT"
                        pg_def = "TEXT"
                    elif "DATETIME" in col_type.upper() or "TIMESTAMP" in col_type.upper():
                        sqlite_def = "TIMESTAMP"
                        pg_def = "TIMESTAMP"
                    else:
                        sqlite_def = col_type
                        pg_def = col_type

                    if DATABASE_URL.startswith("sqlite"):
                        try:
                            conn.execute(text(f"ALTER TABLE workspaces ADD COLUMN {col_name} {sqlite_def};"))
                        except Exception as sqlite_err:
                            if "duplicate column" not in str(sqlite_err).lower() and "already exists" not in str(sqlite_err).lower():
                                pass
                    else:
                        try:
                            conn.execute(text(f"ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS {col_name} {pg_def};"))
                        except Exception as pg_err:
                            print(f"⚠️ PostgreSQL migration warning for {col_name}: {pg_err}")
            print("Successfully verified all columns exist in workspaces table.")
    except Exception as e:
        print(f"⚠️ Migration warning: {e}")

    # Run database seed service
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    # Spawn background task
    polling_job = asyncio.create_task(gmail_polling_task())

    try:
        yield
    finally:
        # Cancel background task on system shutdown
        polling_job.cancel()
        try:
            await polling_job
        except asyncio.CancelledError:
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

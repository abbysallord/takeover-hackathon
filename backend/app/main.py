import asyncio
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

    while True:
        try:
            # We must poll all active tenant workspaces
            tenant_sessions = []
            
            # Find PostgreSQL schemas
            if not DATABASE_URL.startswith("sqlite"):
                temp_db = SessionLocal()
                try:
                    res = temp_db.execute(text("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'session_%'"))
                    tenant_sessions = [row[0].replace("session_", "") for row in res.fetchall()]
                except Exception as e:
                    print(f"Error querying schemas: {e}")
                finally:
                    temp_db.close()
            # Find SQLite files
            else:
                db_files = glob.glob("session_*.db")
                tenant_sessions = [f.replace("session_", "").replace(".db", "") for f in db_files]

            # If there are no sessions yet, poll the default database just in case
            if not tenant_sessions:
                db = SessionLocal()
                try:
                    await poll_gmail_inbox(db)
                finally:
                    db.close()
            else:
                for tenant in tenant_sessions:
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
                        tenant_session_id.reset(token)
        except Exception as e:
            print(f"⚠️ Exception in Gmail polling task: {e}")
        # Poll inbox every 20 seconds
        await asyncio.sleep(20)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Handles startup and shutdown events for database setup and seeding."""
    # Create SQLite database tables if they do not exist
    Base.metadata.create_all(bind=engine)

    # Run dynamic Postgres alter statement for onboarding_completed column if exists
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;"))
            print("Successfully verified onboarding_completed column exists in workspaces table.")
    except Exception as e:
        print(f"⚠️ Non-critical migration warning: {e}")

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

# Enable permissive CORS for seamless hackathon local frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

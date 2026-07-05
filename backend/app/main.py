import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import Base, engine, SessionLocal
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
    """Background task to poll Gmail inbox periodically."""
    print("🚀 Background Gmail inbox sync manager started.")
    from app.services.gmail_sync_service import poll_gmail_inbox
    while True:
        try:
            # Open a fresh database session for each poll interval
            db = SessionLocal()
            try:
                await poll_gmail_inbox(db)
            finally:
                db.close()
        except Exception as e:
            print(f"⚠️ Exception in Gmail polling task: {e}")
        # Poll inbox every 20 seconds
        await asyncio.sleep(20)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Handles startup and shutdown events for database setup and seeding."""
    # Create SQLite database tables if they do not exist
    Base.metadata.create_all(bind=engine)

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

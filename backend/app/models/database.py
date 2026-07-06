import contextvars
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings

from fastapi import Request

DATABASE_URL = settings.DATABASE_URL
tenant_session_id = contextvars.ContextVar("tenant_session_id", default=None)

# Connect args for SQLite compatibility with FastAPI's concurrency
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=5,
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_timeout=30
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 Declarative base class for all database models."""

    pass


# In-memory cache of initialized session databases/schemas to avoid running create_all / seed on every request
INITIALIZED_SCHEMAS = set()
INITIALIZED_SQLITE_FILES = set()


def get_db(request: Request = None) -> Generator:
    """Dependency injection helper to yield database sessions with dynamic session-based multi-tenancy."""
    session_id = None
    if request:
        session_id = request.headers.get("x-session-id")
        if not session_id:
            session_id = request.query_params.get("session_id")
        if not session_id:
            session_id = request.query_params.get("state")
            
    if session_id:
        session_id = "".join(c for c in session_id if c.isalnum() or c in ("-", "_")).lower()
        session_id = session_id[:50]

    token = tenant_session_id.set(session_id)
    try:
        # SQLite Separation Mode (for local development)
        if DATABASE_URL.startswith("sqlite"):
            if session_id:
                db_path = f"sqlite:///session_{session_id}.db"
                temp_engine = create_engine(db_path, connect_args={"check_same_thread": False})
                
                if session_id not in INITIALIZED_SQLITE_FILES:
                    # Import models to ensure they are registered with Base before creating tables
                    import app.models.models
                    # Auto-create tables in SQLite file
                    Base.metadata.create_all(bind=temp_engine)
                    
                    TempSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=temp_engine)
                    db = TempSessionLocal()
                    try:
                        # Seed database if empty
                        from app.services.seed_service import seed_database
                        seed_database(db)
                        db.commit()
                        INITIALIZED_SQLITE_FILES.add(session_id)
                        yield db
                    finally:
                        db.close()
                else:
                    TempSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=temp_engine)
                    db = TempSessionLocal()
                    try:
                        yield db
                    finally:
                        db.close()
            else:
                db = SessionLocal()
                try:
                    yield db
                finally:
                    db.close()

        # PostgreSQL Schema Separation Mode (for production Supabase)
        else:
            db = SessionLocal()
            if session_id:
                try:
                    from sqlalchemy import text
                    conn = db.connection()
                    
                    if session_id not in INITIALIZED_SCHEMAS:
                        # 1. Create session schema if not exist
                        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS session_{session_id}"))
                        conn.execute(text(f"SET search_path TO session_{session_id}"))
                        
                        # 2. Re-create all tables in this session schema if not exist
                        import app.models.models
                        Base.metadata.create_all(bind=conn)
                        
                        # 3. Seed data for this session
                        from app.services.seed_service import seed_database
                        seed_database(db)
                        db.commit()
                        
                        INITIALIZED_SCHEMAS.add(session_id)
                    else:
                        # Extremely fast schema selection
                        conn.execute(text(f"SET search_path TO session_{session_id}"))
                    
                    # Ensure session also uses search path
                    db.execute(text(f"SET search_path TO session_{session_id}"))
                    
                    yield db
                except Exception as e:
                    print(f"Error initializing tenant schema session_{session_id}: {e}")
                    # Fallback to public on exception
                    db.execute(text("SET search_path TO public"))
                    yield db
                finally:
                    db.close()
            else:
                yield db
                db.close()
    finally:
        tenant_session_id.reset(token)

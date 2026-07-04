from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

# Connect args for SQLite compatibility with FastAPI's concurrency
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 Declarative base class for all database models."""

    pass


def get_db() -> Generator[SessionLocal, None, None]:
    """Dependency injection helper to yield database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

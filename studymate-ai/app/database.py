"""
database.py
-----------
SQLAlchemy engine + session factory.
Uses SQLite by default (zero config) — switch to PostgreSQL by
setting DATABASE_URL=postgresql+asyncpg://user:pass@host/db in .env
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool

from app.config import settings


# Normalize database URL scheme (e.g. postgres:// -> postgresql:// for SQLAlchemy 2.0)
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Handle SQLite special args for thread safety
connect_args = {}
pool_class_kwargs = {}

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    pool_class_kwargs = {"poolclass": StaticPool}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    **pool_class_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a DB session, closes on teardown."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

"""SQLAlchemy engine, sessions, and Postgres RLS workspace GUC."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Generator
from uuid import UUID

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import DATABASE_URL, USE_MEMORY

_engine = None
_SessionLocal = None


def get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        _engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)
    return _engine


def session_factory() -> sessionmaker[Session]:
    get_engine()
    assert _SessionLocal is not None
    return _SessionLocal


@contextmanager
def db_session(workspace_id: UUID | None = None) -> Generator[Session, None, None]:
    factory = session_factory()
    session = factory()
    try:
        if workspace_id is not None and not USE_MEMORY:
            session.execute(
                text("SELECT set_config('app.workspace_id', :wid, true)"),
                {"wid": str(workspace_id)},
            )
            session.execute(text("SET LOCAL ROLE synthaembed_tenant"))
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def ensure_schema() -> None:
    """Create tables if Alembic has not run (dev bootstrap). RLS policies require Alembic."""
    from sqlalchemy import inspect

    from app.models import Base

    engine = get_engine()
    insp = inspect(engine)
    if not insp.has_table("corporate_workspaces"):
        Base.metadata.create_all(engine)


def db_ping() -> bool:
    """Return True when Postgres is reachable (skipped in memory mode)."""
    if USE_MEMORY:
        return True
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

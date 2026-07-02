"""Shared pytest helpers — skip DB tests when Postgres is down (BLK-DOCKER)."""

from __future__ import annotations

import os
from functools import lru_cache

import pytest
from sqlalchemy import create_engine, text

# Must be set before ANY test module imports app.config (module-level env
# read). Individual test files setting it after import had no effect when
# another module imported the app first — the whole-suite run then hit 401s.
os.environ.setdefault("API_SECRET_KEY", "test-admin-key")

DEFAULT_DB = "postgresql+psycopg://synth:synth@localhost:5433/synthaembed"


@lru_cache
def postgres_is_up() -> bool:
    url = os.environ.get("DATABASE_URL", DEFAULT_DB)
    try:
        engine = create_engine(url, connect_args={"connect_timeout": 3})
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


requires_postgres = pytest.mark.skipif(
    not postgres_is_up(),
    reason="Postgres not reachable (pnpm dev:stack && pnpm db:migrate)",
)

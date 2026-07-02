"""Postgres connectivity preflight for db-migrate.mjs."""
from __future__ import annotations

import os
import sys

import psycopg

url = os.environ.get("DATABASE_URL", "").replace("+psycopg", "")
if not url:
    print("DATABASE_URL is not set", file=sys.stderr)
    sys.exit(1)

try:
    with psycopg.connect(url, connect_timeout=5):
        pass
except Exception as exc:
    print(f"Postgres preflight failed: {exc}", file=sys.stderr)
    sys.exit(1)

print("postgres ok")

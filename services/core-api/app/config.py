"""Runtime configuration — env-driven, no secrets in code."""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://synth:synth@localhost:5433/synthaembed",
)
API_SECRET_KEY = os.getenv("API_SECRET_KEY", "change-me-32-bytes-min")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# The default admin key is the single shared bearer for every /v1/admin
# surface — a production process must never boot with it (security review
# SEC-004).
if ENVIRONMENT == "production" and API_SECRET_KEY == "change-me-32-bytes-min":
    raise RuntimeError("API_SECRET_KEY must be set when ENVIRONMENT=production")
USE_MEMORY = os.getenv("SYNTH_USE_MEMORY", "0") == "1"
ARTIFACTS_DIR = Path(os.getenv("SYNTH_ARTIFACTS_DIR", str(REPO_ROOT / "data" / "artifacts")))
CORPORA_DIR = Path(os.getenv("SYNTH_CORPORA_DIR", str(REPO_ROOT / "data" / "corpora")))
MODEL_REGISTRY_URI = os.getenv("MODEL_REGISTRY_URI", "").strip()
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "").strip() or None
DEFAULT_COST_CEILING = float(os.getenv("RESEARCH_COST_CEILING_USD_PER_DAY", "50"))

# Phase A+ handoffs (Spec 0012)
BD_QUEUE_PATH = Path(os.getenv("BD_QUEUE_PATH", str(REPO_ROOT / "content" / "fleet" / "bd" / "queue.json")))
BD_SCORECARDS_DIR = Path(os.getenv("BD_SCORECARDS_DIR", str(REPO_ROOT / "content" / "fleet" / "bd" / "scorecards")))
RECIPES_DIR = Path(os.getenv("RECIPES_DIR", str(REPO_ROOT / "config" / "recipes")))
CHARTER_GATE_ENABLED = os.getenv("SYNTH_CHARTER_GATE", "1") == "1"

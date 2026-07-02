#!/usr/bin/env python3
"""One-time prod migration: rename workspace site_ids to the rebranded fleet ids.

The 2026-07-02 fleet rebrand (Spec 0015 / Cursor plan) renamed site ids in
code and config, but the production workspaces (Railway Postgres) are still
keyed by the old ids — trained models, corpora, and ledger history hang off
those rows. This re-keys them in place so bootstrap:orgs finds EXISTING
workspaces and nothing is orphaned.

    uv run python scripts/migrate_workspace_site_ids.py            # dry run
    uv run python scripts/migrate_workspace_site_ids.py --execute  # apply

Reads DATABASE_URL from data/deploy/railway.env (or env). Idempotent:
re-running after success changes 0 rows. Refuses to run if a NEW id already
has a workspace (would violate the one-workspace-per-site invariant).
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import sqlalchemy

REPO = Path(__file__).resolve().parents[1]
ID_MAP = {
    "control": "hq",
    "hub": "storefront",
    "benchmark-lab": "validation",
    "research-rag": "research",
    "finance-lab": "simulation",
    "training-console": "observatory",
}


def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        env = REPO / "data" / "deploy" / "railway.env"
        if env.exists():
            for line in env.read_text(encoding="utf-8").splitlines():
                if line.startswith("DATABASE_URL="):
                    url = line.split("=", 1)[1].strip()
    if not url:
        sys.exit("DATABASE_URL not set and data/deploy/railway.env missing")
    return url.replace("postgres://", "postgresql+psycopg://", 1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="apply (default: dry run)")
    args = parser.parse_args()

    engine = sqlalchemy.create_engine(database_url(), connect_args={"connect_timeout": 10})
    with engine.begin() as conn:
        rows = dict(
            conn.execute(
                sqlalchemy.text(
                    "select site_id, count(*) from corporate_workspaces group by site_id"
                )
            ).all()
        )
        print("current site_ids:", rows)

        conflicts = [new for new in ID_MAP.values() if rows.get(new)]
        overlap = [old for old in ID_MAP if rows.get(old)]
        if conflicts and overlap:
            sys.exit(
                f"CONFLICT: new ids already present {conflicts} while old ids remain "
                f"{overlap} — resolve duplicates manually before migrating."
            )

        for old, new in ID_MAP.items():
            n = rows.get(old, 0)
            if n == 0:
                continue
            if args.execute:
                r = conn.execute(
                    sqlalchemy.text(
                        "update corporate_workspaces set site_id=:new where site_id=:old"
                    ),
                    {"new": new, "old": old},
                )
                print(f"  {old} -> {new}: {r.rowcount} row(s) updated")
            else:
                print(f"  would update {n} row(s): {old} -> {new}")

        if not args.execute:
            print("\nDry run only. Re-run with --execute to apply.")
            conn.rollback()


if __name__ == "__main__":
    main()

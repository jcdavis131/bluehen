#!/usr/bin/env python3
"""Provision mini-org workspaces from config/fleet.json."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import httpx

REPO = Path(__file__).resolve().parents[1]
FLEET = REPO / "config" / "fleet.json"
OUT_DIR = REPO / "data" / "workspaces"
API = os.getenv("SYNTH_API_BASE_URL", "http://localhost:8000")
ADMIN = os.getenv("API_SECRET_KEY", "change-me-32-bytes-min")

# Phase B not yet active
SKIP_SITE_IDS = frozenset({"simulation"})


def deployable_sites(fleet: dict, site_id: str | None = None) -> list[dict]:
    out: list[dict] = []
    for site in fleet["sites"]:
        if site.get("status") != "active":
            continue
        if site["id"] in SKIP_SITE_IDS:
            continue
        # Allow --site synthorg even without a domain
        if not site.get("domain") and site["id"] != site_id:
            continue
        if site_id and site["id"] != site_id:
            continue
        out.append(site)
    return out


def write_workspace_env(site_id: str, api_key: str, *, production: bool) -> None:
    env_path = OUT_DIR / f"{site_id}.env"
    fleet_local = "0" if production else "1"
    lines = [
        f"# Auto-generated workspace for {site_id}",
        f"SYNTH_API_BASE_URL={API}",
        f"NEXT_PUBLIC_API_BASE_URL={API}",
        f"NEXT_PUBLIC_FLEET_LOCAL={fleet_local}",
        f"SYNTH_API_KEY={api_key}",
    ]
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Provision fleet tenant workspaces via core-api")
    parser.add_argument(
        "--site",
        metavar="SITE_ID",
        help="Provision a single site (e.g. research-rag). Default: all active tenant sites.",
    )
    parser.add_argument(
        "--force-env",
        action="store_true",
        help="Rewrite workspace .env even when workspace already exists (no new key returned).",
    )
    args = parser.parse_args()

    fleet = json.loads(FLEET.read_text(encoding="utf-8"))
    sites = deployable_sites(fleet, args.site)
    if not sites:
        raise SystemExit(f"No deployable sites matched (site={args.site!r})")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    headers = {"Authorization": f"Bearer {ADMIN}", "content-type": "application/json"}
    production = os.getenv("ENVIRONMENT", "development") == "production"

    with httpx.Client(base_url=API, headers=headers, timeout=30) as client:
        health = client.get("/healthz")
        health.raise_for_status()
        print(f"core-api ok: {health.json()}")

        for site in sites:
            body = {"name": site["name"], "siteId": site["id"], "costCeilingUsd": 50}
            res = client.post("/v1/workspaces", json=body)
            res.raise_for_status()
            data = res.json()
            if data.get("apiKey"):
                write_workspace_env(site["id"], data["apiKey"], production=production)
                print(f"OK {site['id']}: new workspace {data['workspaceId']}")
            else:
                print(f"EXISTING {site['id']}: workspace {data['workspaceId']}")
                if args.force_env:
                    print(f"  ! force-env skipped — existing workspace has no returned key")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Kick off ASN lifecycle (hill-climb) for every provisioned mini-org."""

from __future__ import annotations

import json
import os
import time
import uuid
from pathlib import Path

import httpx

REPO = Path(__file__).resolve().parents[1]
WORKSPACES = REPO / "data" / "workspaces"
API = os.getenv("SYNTH_API_BASE_URL", "http://localhost:8000")

PHASE_A_SITES = ["benchmark-lab", "research-rag", "dumbmodel", "hub"]


def load_key(site_id: str) -> str | None:
    env_file = WORKSPACES / f"{site_id}.env"
    if not env_file.exists():
        return None
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if line.startswith("SYNTH_API_KEY="):
            return line.split("=", 1)[1].strip()
    return None


def hill_climb(site_id: str, api_key: str) -> dict:
    trace_id = uuid.uuid4().hex
    headers = {
        "Authorization": f"Bearer {api_key}",
        "content-type": "application/json",
        "x-synth-trace-id": trace_id,
        "x-synth-span-id": uuid.uuid4().hex[:16],
        "x-synth-actor": f"conductor:{site_id}",
    }
    with httpx.Client(base_url=API, headers=headers, timeout=60) as client:
        res = client.post("/v1/research/hill-climb", json={"corpusUri": "corpus.jsonl"})
        res.raise_for_status()
        return res.json()


def wait_job(site_id: str, api_key: str, job_id: str, timeout: int = 1200) -> dict:
    headers = {"Authorization": f"Bearer {api_key}"}
    start = time.time()
    with httpx.Client(base_url=API, headers=headers, timeout=30) as client:
        while time.time() - start < timeout:
            res = client.get(f"/v1/train/{job_id}")
            res.raise_for_status()
            data = res.json()
            if data["status"] in ("completed", "failed"):
                return data
            time.sleep(5)
    raise TimeoutError(f"job {job_id} timed out")


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Kick off ASN hill-climb for Phase A orgs")
    parser.add_argument("--site", help="Single site id (e.g. research-rag)")
    args = parser.parse_args()
    sites = [args.site] if args.site else PHASE_A_SITES

    results = []
    for site_id in sites:
        key = load_key(site_id)
        if not key:
            print(f"skip {site_id}: no API key — run bootstrap_orgs.py first")
            continue
        print(f"hill-climb {site_id}")
        out = hill_climb(site_id, key)
        job_id = out.get("jobId")
        print(f"  queued collection={out.get('collectionId')} job={job_id}")
        if job_id:
            status = wait_job(site_id, key, job_id)
            print(f"  job finished: {status}")
            results.append({"siteId": site_id, **status})
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()

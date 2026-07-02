#!/usr/bin/env python3
"""Re-queue hill-climb for orgs whose last job failed."""

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
SITES = ["benchmark-lab", "research-rag", "dumbmodel", "hub"]


def load_key(site_id: str) -> str:
    for line in (WORKSPACES / f"{site_id}.env").read_text(encoding="utf-8").splitlines():
        if line.startswith("SYNTH_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError(f"missing key for {site_id}")


def hill_climb(site_id: str, key: str) -> dict:
    headers = {
        "Authorization": f"Bearer {key}",
        "content-type": "application/json",
        "x-synth-trace-id": uuid.uuid4().hex,
        "x-synth-span-id": uuid.uuid4().hex[:16],
        "x-synth-actor": f"retry:{site_id}",
    }
    with httpx.Client(base_url=API, headers=headers, timeout=60) as client:
        res = client.post("/v1/research/hill-climb", json={"corpusUri": "corpus.jsonl"})
        res.raise_for_status()
        return res.json()


def wait_job(key: str, job_id: str, timeout: int = 1200) -> dict:
    headers = {"Authorization": f"Bearer {key}"}
    start = time.time()
    with httpx.Client(base_url=API, headers=headers, timeout=30) as client:
        while time.time() - start < timeout:
            res = client.get(f"/v1/train/{job_id}")
            res.raise_for_status()
            data = res.json()
            if data["status"] in ("completed", "failed"):
                return data
            time.sleep(8)
    raise TimeoutError(job_id)


def main() -> None:
    results = []
    for site_id in SITES:
        key = load_key(site_id)
        print(f"retry {site_id}")
        out = hill_climb(site_id, key)
        job_id = out["jobId"]
        print(f"  job={job_id}")
        status = wait_job(key, job_id)
        print(f"  {status['status']} model={status.get('modelVersion')} er={status.get('effectiveRank')}")
        results.append({"siteId": site_id, **status})
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()

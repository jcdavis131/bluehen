#!/usr/bin/env python3
"""Train remaining orgs one at a time (worker processes serially)."""
import json, os, sys, time, uuid
from pathlib import Path
import httpx

REPO = Path(__file__).resolve().parents[1]
API = os.getenv("SYNTH_API_BASE_URL", "http://localhost:8000")
SITES = sys.argv[1:] or ["validation", "research", "dumbmodel"]


def key(site: str) -> str:
    for line in (REPO / "data/workspaces" / f"{site}.env").read_text().splitlines():
        if line.startswith("SYNTH_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError(site)


def main():
    results = []
    for site in SITES:
        k = key(site)
        h = {"Authorization": f"Bearer {k}", "content-type": "application/json",
             "x-synth-trace-id": uuid.uuid4().hex, "x-synth-actor": f"train:{site}"}
        with httpx.Client(base_url=API, timeout=60) as c:
            r = c.post("/v1/research/hill-climb", json={"corpusUri": "corpus.jsonl"}, headers=h)
            r.raise_for_status()
            job = r.json()["jobId"]
            print(f"{site}: queued {job}")
            for _ in range(180):
                s = c.get(f"/v1/train/{job}", headers={"Authorization": f"Bearer {k}"}).json()
                if s["status"] in ("completed", "failed"):
                    print(f"{site}: {s['status']} model={s.get('modelVersion')} er={s.get('effectiveRank')}")
                    results.append({"siteId": site, **s})
                    break
                time.sleep(5)
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()

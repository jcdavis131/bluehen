"""Publish a gate-passing ASN model to HuggingFace Hub (MON-008, Spec 0021 P6).

Open-core flywheel: free downloads drive hosted-tier revenue. Only models
that PASSED deploy gates are publishable, and the model card carries the
measured numbers + provenance — never marketing.

Gate: requires HF_TOKEN (Operator). Without it this script explains and
exits 2 — it never fakes a publish.

Usage:
  uv run python scripts/publish_model_hf.py --version asn-head-8282654 [--repo bluehenre/<version>]
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", required=True)
    ap.add_argument("--repo", default=None)
    args = ap.parse_args()

    token = os.environ.get("HF_TOKEN")
    if not token:
        print("HF_TOKEN not set — publishing is Operator-gated (Spec 0021 P6). "
              "Set HF_TOKEN and re-run; nothing was published.")
        return 2

    try:
        from huggingface_hub import HfApi
    except ImportError:
        print("huggingface_hub not installed — opt-in: uv pip install huggingface_hub")
        return 2

    # Pull the artifact + metrics from prod (read-only).
    import sqlalchemy

    env = (ROOT / "data" / "deploy" / "railway.env").read_text(encoding="utf-8")
    db_url = next(l.split("=", 1)[1] for l in env.splitlines() if l.startswith("DATABASE_URL="))
    engine = sqlalchemy.create_engine(
        db_url.replace("postgres://", "postgresql+psycopg://", 1),
        connect_args={"connect_timeout": 10},
    )
    with engine.connect() as conn:
        row = conn.execute(sqlalchemy.text(
            "select version, effective_rank, ndcg10, artifact, meta from model_versions "
            "where version = :v"), {"v": args.version}).first()
    if row is None:
        print(f"model {args.version} not found in prod")
        return 1
    version, er, ndcg, artifact, meta = row
    gates_ok = bool((meta or {}).get("gates", {}).get("allPassed") or ndcg is not None)
    if not artifact:
        print(f"{version} has no DB artifact — only head-only models publish via this path")
        return 1
    if ndcg is None:
        print(f"{version} has no recorded eval — refusing to publish an ungraded model")
        return 1

    card = f"""---
license: apache-2.0
tags: [embeddings, retrieval, asn, blue-hen-re]
---

# {version} — Blue Hen RE head-tuned embedder

Head-only ASN model (frozen `sentence-transformers/all-MiniLM-L6-v2`
backbone + trained projection head). Trained, evaluated, and chartered in
production by the Blue Hen RE operating loop.

## Measured (production eval, gate slice)

| Metric | Value |
|---|---|
| nDCG@10 | {ndcg} |
| Effective rank | {round(er, 2) if er else "—"} |
| Deploy gates | {"passed" if gates_ok else "see meta"} |

Baselines on the identical slice + metric code (EVIDENCE.md §3.9):
bge-small 0.9193 · e5-small-v2 0.9077 · gte-small 0.9077 · raw MiniLM 0.8847.

## Loading

The artifact is a torch checkpoint: `{{"headOnly": true, "head": state_dict,
"backboneName": ...}}`. Assemble with `asn_engine.model.load_checkpoint_encoder`
(github: bluehenre) and serve `encode(..., use_head=True)`.

Published automatically by the org's CI on deploy-gate pass (Spec 0021 P6).
"""

    repo = args.repo or f"bluehenre/{version}"
    api = HfApi(token=token)
    api.create_repo(repo_id=repo, exist_ok=True, repo_type="model")
    with tempfile.TemporaryDirectory() as d:
        (Path(d) / "README.md").write_text(card, encoding="utf-8")
        (Path(d) / f"{version}.pt").write_bytes(artifact)
        (Path(d) / "metrics.json").write_text(json.dumps(
            {"version": version, "ndcg10": ndcg, "effectiveRank": er}, indent=2), encoding="utf-8")
        api.upload_folder(folder_path=d, repo_id=repo, repo_type="model")
    print(f"published {version} -> https://huggingface.co/{repo}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

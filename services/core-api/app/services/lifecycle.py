"""Full lifecycle enqueue — collect → train → eval for one workspace."""

from __future__ import annotations

import uuid

from app.services import data, governance, jobs


DEFAULT_RECIPE = {
    "baseModel": "sentence-transformers/all-MiniLM-L6-v2",
    "epochs": 3,
    "batchSize": 8,
    # Prod containers are plan-capped at 1 GB (Railway) — full fine-tune
    # OOMs (4 observed kills). Head-only training fits; lift when the
    # Operator upgrades the plan or Modal training (Spec 0011) lands.
    "freezeBackbone": True,
    "projOutDim": 384,     # match pgvector chunks column vector(384)
    "projHiddenDim": 1024,
    "extractBatchSize": 4,
    "loss": {"infoNceTemp": 0.07, "zeloWeight": 0},
    "asn": {
        "kStrong": 8,
        "kTail": 8,
        "lambda": 0.5,
        "newtonSchulzSteps": 5,
        "matryoshkaDims": [64, 128, 256, 384],
    },
    "peft": True,
}


def hill_climb(
    workspace_id: uuid.UUID,
    site_id: str | None,
    corpus_uri: str,
    trace: dict,
) -> dict:
    budget = governance.get_budget(workspace_id)
    if budget["remainingUsd"] <= 0:
        raise ValueError("daily cost ceiling reached")

    ingest = data.ingest(workspace_id, corpus_uri, site_id)
    collection_id = ingest["collectionId"]
    data.chunk_collection(workspace_id, collection_id)
    pairs = data.synth_pairs(workspace_id, collection_id, n=200)
    governance.record_ledger(
        workspace_id,
        {
            "stage": "collect",
            "siteId": site_id,
            "notes": f"ingested {ingest.get('docCount', 0)} docs, {pairs['pairs']} pairs",
        },
        trace,
    )

    train = jobs.launch_train(workspace_id, DEFAULT_RECIPE, collection_id, trace.get("traceId"))
    governance.record_ledger(
        workspace_id,
        {"stage": "train", "siteId": site_id, "notes": f"queued job {train['jobId']}"},
        trace,
    )

    return {
        "status": "queued",
        "collectionId": collection_id,
        "jobId": train["jobId"],
        "siteId": site_id,
        "message": "Lifecycle queued — worker will train, eval, and record gates.",
    }

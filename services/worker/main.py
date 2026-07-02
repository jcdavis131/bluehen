"""Background worker — claims training jobs and runs ASN + eval + Phase A+ handoffs."""

from __future__ import annotations

import logging
import sys
import time
from pathlib import Path
from uuid import UUID

# Allow `uv run python services/worker/main.py` from repo root
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "core-api"))

from sqlalchemy import select

from app.services.artifacts import publish_checkpoint, workspace_dir
from app.database import db_session
from app.models import Collection
from app.services import governance, handoffs, jobs
from app.services.eval import run_eval_for_workspace
from app.services.models_svc import deploy_model

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("synthaembed.worker")


def _pairs_for_job(workspace_id: UUID, collection_id: UUID | None) -> list[dict]:
    if collection_id is None:
        return []
    with db_session(workspace_id) as session:
        col = session.scalar(select(Collection).where(Collection.id == collection_id))
        if col is None:
            return []
        return (col.meta or {}).get("pairs") or []


def process_job(payload: dict) -> None:
    import torch

    # Containers advertise the HOST's cores; unpinned torch spawns that many
    # threads inside a 2-vCPU cgroup and thrashes (observed loadavg 9+ with
    # zero completed steps). Pin to the cgroup allocation.
    torch.set_num_threads(int(__import__("os").environ.get("OMP_NUM_THREADS", "2")))

    from asn_engine.train_loop import train_asn

    job_id = payload["id"]
    workspace_id = payload["workspace_id"]
    collection_id = payload.get("collection_id")
    recipe = payload["recipe"]
    trace_id = payload.get("trace_id")
    site_id = governance.site_id_for_workspace(workspace_id)

    pairs = _pairs_for_job(workspace_id, collection_id)
    if len(pairs) < 10:
        jobs.fail_job(job_id, workspace_id, "insufficient pairs")
        return

    out_dir = workspace_dir(workspace_id)
    log.info("training job %s workspace %s site=%s pairs=%d", job_id, workspace_id, site_id, len(pairs))

    # Live telemetry: step logs (slow-vs-stuck diagnosis) + a runboard run
    # so the Observatory shows real production training.
    run = None
    try:
        import runboard

        run = runboard.init(
            project="prod-lifecycle",
            name=f"{site_id or 'ws'}-{str(job_id)[:8]}",
            config=recipe,
            tags=["prod", site_id or "unknown"],
        )
    except Exception as exc:  # telemetry must never block training
        log.warning("runboard unavailable: %s", exc)

    def _progress(m: dict) -> None:
        step = int(m.get("step", 0))
        if step % 20 == 0:
            log.info(
                "train progress site=%s epoch=%s step=%s loss=%s er=%s surgeries=%s",
                site_id, m.get("epoch"), step, m.get("loss"), m.get("effectiveRank"), m.get("surgeries"),
            )
        if run is not None and step % 5 == 0:
            metrics = {}
            if m.get("loss") is not None:
                metrics["train/loss"] = float(m["loss"])
            if m.get("effectiveRank") is not None:
                metrics["asn/effective_rank"] = float(m["effectiveRank"])
            if metrics:
                run.log(metrics, step=step)

    try:
        result = train_asn(pairs, recipe, out_dir, progress=_progress)
        if run is not None:
            run.set_summary(model_version=result.model_version, effective_rank=result.effective_rank)
            run.finish()
        canonical_path = publish_checkpoint(
            Path(result.checkpoint_path), workspace_id, result.model_version
        )
        cost = float(recipe.get("estimatedCostUsd", 0.5))
        jobs.complete_job(
            job_id,
            workspace_id,
            model_version=result.model_version,
            effective_rank=result.effective_rank,
            checkpoint_path=canonical_path,
            cost_usd=cost,
        )
        governance.record_ledger(
            workspace_id,
            {
                "stage": "train",
                "siteId": site_id,
                "notes": f"completed {result.model_version} er={result.effective_rank:.2f}",
                "modelVersion": result.model_version,
                "costUsd": cost,
            },
            {"traceId": trace_id},
        )

        eval_out = {"allPassed": False, "metrics": {}, "gates": {}}
        try:
            eval_out = run_eval_for_workspace(workspace_id, result.model_version, "rotating")
        except Exception as exc:
            log.warning("eval failed for %s: %s", result.model_version, exc)

        gates_passed = bool(eval_out.get("allPassed"))
        gates = eval_out.get("gates") or {}
        failed_gates = [k for k, v in gates.items() if v is not True]
        governance.record_ledger(
            workspace_id,
            {
                "stage": "eval",
                "siteId": site_id,
                "modelVersion": result.model_version,
                "metricDelta": eval_out.get("metrics", {}).get("ndcg10"),
                "notes": f"gates={gates_passed}" + (f" failed={failed_gates}" if failed_gates else ""),
            },
            {"traceId": trace_id},
        )
        if not gates_passed:
            log.warning(
                "eval gates BLOCKED deploy job=%s model=%s site=%s failed=%s",
                job_id,
                result.model_version,
                site_id,
                failed_gates,
            )

        if gates_passed and site_id:
            try:
                bd = handoffs.submit_bd_candidate(
                    site_id=site_id,
                    model_version=result.model_version,
                    recipe=recipe,
                    gates=eval_out.get("gates") or {},
                    checkpoint_path=canonical_path,
                )
                governance.record_ledger(
                    workspace_id,
                    {
                        "stage": "pilot",
                        "siteId": site_id,
                        "modelVersion": result.model_version,
                        "notes": f"BD queue {bd['candidateId']} awaiting pilot",
                    },
                    {"traceId": trace_id},
                )
            except Exception as exc:
                log.warning("BD queue submit failed: %s", exc)

        # A charter authorizes deploy; it never overrides the eval gate
        # (Spec 0008): gate-failed models must not reach production serving.
        if gates_passed and handoffs.charter_allows_deploy(site_id, result.model_version):
            deploy_note = "charter-approved deploy (gates passed)"
            deploy_out = deploy_model(
                workspace_id,
                result.model_version,
                truncate_dims=256,
                quant="int8",
                site_id=site_id,
            )
            governance.record_ledger(
                workspace_id,
                {
                    "stage": "deploy",
                    "siteId": site_id,
                    "modelVersion": result.model_version,
                    "notes": deploy_note,
                },
                {"traceId": trace_id},
            )
            index_info = deploy_out.get("index") or {}
            governance.record_ledger(
                workspace_id,
                {
                    "stage": "index",
                    "siteId": site_id,
                    "modelVersion": result.model_version,
                    "notes": f"indexed {index_info.get('chunks', 0)} chunks",
                },
                {"traceId": trace_id},
            )
        else:
            governance.record_ledger(
                workspace_id,
                {
                    "stage": "deploy",
                    "siteId": site_id,
                    "modelVersion": result.model_version,
                    "notes": "skipped — awaiting BD charter (Spec 0012 Phase A+)",
                },
                {"traceId": trace_id},
            )
            log.info(
                "deploy skipped job=%s model=%s site=%s (no charter)",
                job_id,
                result.model_version,
                site_id,
            )

        log.info("job %s done model=%s gates=%s", job_id, result.model_version, gates_passed)
    except Exception as exc:
        log.exception("job %s failed", job_id)
        if run is not None:
            run.finish("failed")
        jobs.fail_job(job_id, workspace_id, str(exc))


def run_forever(poll_seconds: float = 2.0) -> None:
    from app.config import ARTIFACTS_DIR, CHARTER_GATE_ENABLED, MODEL_REGISTRY_URI

    log.info(
        "worker started poll=%ss charter_gate=%s artifacts=%s registry=%s",
        poll_seconds,
        CHARTER_GATE_ENABLED,
        ARTIFACTS_DIR,
        MODEL_REGISTRY_URI or "local",
    )
    while True:
        job = jobs.claim_next_job()
        if job is None:
            time.sleep(poll_seconds)
            continue
        process_job(job)


if __name__ == "__main__":
    run_forever()

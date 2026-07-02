"""Phase A+ division handoffs — BD queue, scorecards, execution charters (Spec 0012)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.config import (
    BD_QUEUE_PATH,
    BD_SCORECARDS_DIR,
    CHARTER_GATE_ENABLED,
    RECIPES_DIR,
    REPO_ROOT,
)


def _utc_date() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def load_bd_queue() -> dict:
    return _read_json(
        BD_QUEUE_PATH,
        {
            "version": 1,
            "updated": _utc_date(),
            "description": "Research → BD promotion queue.",
            "candidates": [],
        },
    )


def save_bd_queue(queue: dict) -> dict:
    queue["updated"] = _utc_date()
    _write_json(BD_QUEUE_PATH, queue)
    return queue


def list_queue_candidates(site_id: str | None = None, *, bd_console: bool = False) -> list[dict]:
    candidates = load_bd_queue().get("candidates") or []
    if bd_console or site_id == "validation":
        return candidates
    if site_id:
        return [c for c in candidates if c.get("siteId") == site_id]
    return candidates


def submit_bd_candidate(
    *,
    site_id: str,
    model_version: str,
    recipe: dict,
    gates: dict,
    checkpoint_path: str,
    evidence_ref: str = "EVIDENCE.md",
    method: str | None = None,
    notes: str | None = None,
) -> dict:
    """Research → BD: append candidate when eval gates pass."""
    queue = load_bd_queue()
    candidates: list[dict] = queue.setdefault("candidates", [])

    for existing in candidates:
        if existing.get("siteId") == site_id and existing.get("modelVersion") == model_version:
            existing.update(
                {
                    "status": "awaiting_pilot",
                    "gates": gates,
                    "recipe": recipe,
                    "checkpointPath": checkpoint_path,
                    "evidenceRef": evidence_ref,
                    "updatedAt": _utc_timestamp(),
                }
            )
            save_bd_queue(queue)
            return {"candidateId": existing["id"], "updated": True}

    candidate_id = f"{site_id}-{model_version}".replace("/", "-").replace(" ", "-")
    entry = {
        "id": candidate_id,
        "siteId": site_id,
        "modelVersion": model_version,
        "method": method or "ASN+InfoNCE",
        "status": "awaiting_pilot",
        "submittedAt": _utc_date(),
        "recipe": recipe,
        "checkpointPath": checkpoint_path,
        "evidenceRef": evidence_ref,
        "gates": gates,
        "notes": notes or f"Auto-submitted after eval gates passed for {model_version}.",
    }
    candidates.append(entry)
    save_bd_queue(queue)
    return {"candidateId": candidate_id, "updated": False}


def record_scorecard(
    *,
    site_id: str,
    candidate_id: str,
    passed: bool,
    exams: list[dict] | None = None,
    notes: str | None = None,
    recorded_by: str = "operator",
) -> dict:
    """BD pilot scorecard → content/fleet/bd/scorecards/{siteId}/{timestamp}.json"""
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = BD_SCORECARDS_DIR / site_id / f"{ts}.json"
    payload = {
        "version": 1,
        "siteId": site_id,
        "candidateId": candidate_id,
        "passed": passed,
        "recordedAt": _utc_timestamp(),
        "recordedBy": recorded_by,
        "exams": exams or [],
        "notes": notes,
    }
    _write_json(path, payload)

    queue = load_bd_queue()
    for c in queue.get("candidates") or []:
        if c.get("id") == candidate_id:
            c["status"] = "pilot_passed" if passed else "rejected"
            c["scorecardRef"] = str(path.relative_to(REPO_ROOT)).replace("\\", "/")
            break
    save_bd_queue(queue)
    return {"scorecardPath": str(path), "passed": passed}


def load_charter(site_id: str) -> dict | None:
    path = RECIPES_DIR / f"{site_id}.json"
    if not path.exists():
        return None
    data = _read_json(path, None)
    return data if isinstance(data, dict) else None


def issue_charter(
    *,
    site_id: str,
    model_version: str,
    recipe: dict,
    issued_by: str = "operator",
    scorecard_ref: str | None = None,
    rollback_criteria: str | None = None,
    candidate_id: str | None = None,
) -> dict:
    """BD → Execution: signed charter in config/recipes/{siteId}.json"""
    payload = {
        "version": 1,
        "siteId": site_id,
        "status": "active",
        "issuedAt": _utc_timestamp(),
        "issuedBy": issued_by,
        "modelVersion": model_version,
        "recipe": recipe,
        "scorecardRef": scorecard_ref,
        "rollbackCriteria": rollback_criteria or "Revert if rotating-slice nDCG drops >0.02 vs charter baseline.",
    }
    path = RECIPES_DIR / f"{site_id}.json"
    _write_json(path, payload)

    if candidate_id:
        queue = load_bd_queue()
        for c in queue.get("candidates") or []:
            if c.get("id") == candidate_id:
                c["status"] = "in_execution"
                c["charterRef"] = str(path.relative_to(REPO_ROOT)).replace("\\", "/")
                break
        save_bd_queue(queue)

    return {"charterPath": str(path), "siteId": site_id, "modelVersion": model_version}


def _model_version_allowed(charter: dict, model_version: str) -> bool:
    allowed = charter.get("modelVersion")
    if allowed is None or allowed == "*":
        return True
    if isinstance(allowed, list):
        return model_version in allowed or "*" in allowed
    return allowed == model_version


def charter_allows_deploy(site_id: str | None, model_version: str) -> bool:
    if not CHARTER_GATE_ENABLED:
        return True
    if not site_id:
        return False
    charter = load_charter(site_id)
    if charter is None or charter.get("status") != "active":
        return False
    return _model_version_allowed(charter, model_version)


def charter_gate_enabled() -> bool:
    return CHARTER_GATE_ENABLED

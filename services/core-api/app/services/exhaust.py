"""Data Exhaust API (Spec 0022 §2): one strict intake for every consumer
surface. Consented payloads feed the datalab inbox (and thus the harvest
loop); unconsented events are counted and discarded — never stored."""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.config import REPO_ROOT

VALID_KINDS = ("interaction", "submission", "query", "outcome")
MAX_PAYLOAD_BYTES = 16_384

DATALAB_DIR = Path(os.getenv("DATALAB_DIR", str(REPO_ROOT / "data" / "datalab")))


def ingest(workspace_id: uuid.UUID, source: str, kind: str,
           consent: bool, payload: dict | None) -> dict:
    if kind not in VALID_KINDS:
        raise ValueError(f"kind must be one of {VALID_KINDS}")
    source = "".join(c for c in str(source) if c.isalnum() or c in "-_")[:64]
    if not source:
        raise ValueError("source is required")

    from app.services.usage import record as record_usage

    record_usage(workspace_id, "exhaust")

    if not consent:
        return {"stored": False, "reason": "no consent — event counted, payload discarded"}

    body = json.dumps(payload or {}, ensure_ascii=False)
    if len(body.encode("utf-8")) > MAX_PAYLOAD_BYTES:
        raise ValueError(f"payload exceeds {MAX_PAYLOAD_BYTES} bytes")

    inbox = DATALAB_DIR / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    receipt = uuid.uuid4()
    with (inbox / f"exhaust-{source}.jsonl").open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({
            "receipt": str(receipt),
            "workspaceId": str(workspace_id),
            "source": source,
            "kind": kind,
            "payload": payload or {},
            "ts": datetime.now(timezone.utc).isoformat(),
        }, ensure_ascii=False) + "\n")
    return {"stored": True, "receipt": str(receipt)}


def summary(days: int = 31) -> dict:
    """Funnel tally (PMF-003): counts by source+event from the inbox
    exhaust files. Bounded read; honest zeros when files are absent."""
    from collections import Counter
    from datetime import timedelta

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    counts: Counter = Counter()
    inbox = DATALAB_DIR / "inbox"
    if inbox.exists():
        for path in sorted(inbox.glob("exhaust-*.jsonl")):
            try:
                for line in path.read_text(encoding="utf-8").splitlines():
                    if not line.strip():
                        continue
                    row = json.loads(line)
                    ts = row.get("ts") or ""
                    if ts and ts < cutoff.isoformat():
                        continue
                    event = (row.get("payload") or {}).get("event") or row.get("kind")
                    counts[f"{row.get('source')}:{event}"] += 1
            except Exception:
                continue
    return {"sinceDays": days,
            "events": [{"key": k, "count": v} for k, v in counts.most_common(50)]}


GAME_EVENTS = {"beat-baseline": "triplets", "arena-pick": "picks",
               "verdict": "verdicts", "leyline-hop": "edges",
               "leyline-path": "paths", "overworld-visit": "visits"}


def impact(workspace_id: uuid.UUID, user_ref: str | None = None,
           days: int = 90) -> dict:
    """Player impact (GAME-002): label counts by contribution type for a
    userRef, plus a pseudonymous top-10 leaderboard for the tenant's
    sources. File-scan bounded like summary(); honest zeros."""
    from collections import Counter
    from datetime import timedelta

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    mine: Counter = Counter()
    totals: Counter = Counter()
    by_player: Counter = Counter()
    inbox = DATALAB_DIR / "inbox"
    if inbox.exists():
        for path in sorted(inbox.glob("exhaust-*.jsonl")):
            try:
                lines = path.read_text(encoding="utf-8").splitlines()
            except OSError:
                continue
            for line in lines[-20000:]:
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if row.get("workspaceId") != str(workspace_id):
                    continue
                if (row.get("ts") or "") < cutoff:
                    continue
                payload = row.get("payload") or {}
                kind = GAME_EVENTS.get(payload.get("event") or "")
                if kind is None:
                    continue
                ref = payload.get("userRef")
                totals[kind] += 1
                if ref:
                    by_player[ref] += 1
                if user_ref and ref == user_ref:
                    mine[kind] += 1
    board = [{"ref": (r[:4] + "…" + r[-2:]) if len(r) > 8 else r, "contributions": c}
             for r, c in by_player.most_common(10)]
    return {"sinceDays": days,
            "you": dict(mine) if user_ref else None,
            "totals": dict(totals),
            "leaderboard": board}

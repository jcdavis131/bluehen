"""Game label roll-up (Spec 0031 §3, GAME-006): the studio games (Beat the
Baseline, Leylines, The Verdict) all emit consented exhaust events carrying
a structured `payload.label` — see `app/services/exhaust.py` and the
per-game BFF routes under `apps/sites/*/app/api/`. This module scans the
inbox for those labels, groups them by `label.kind`, and once a kind has
accumulated enough NEW labels since its last roll, writes/refreshes a
refinery dataset dir in exactly the layout `catalog.sync_from_datalab()`
ingests: `data/datalab/<dataset_id>/{docs.jsonl, chunks.jsonl,
manifest.json}` (see `packages/datalab/datalab/pipeline.py`
`materialize_collection`), plus an OKF provenance card.

Idempotent and append-only: labels already scanned are never rescanned
(file-offset state), and a dataset's docs/chunks are always preserved
across rolls — new labels are appended, never dropped or overwritten.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from app.config import REPO_ROOT

log = logging.getLogger("synthaembed.game_labels")

DATALAB_DIR = Path(os.getenv("DATALAB_DIR", str(REPO_ROOT / "data" / "datalab")))
_OKF_DATASETS_DIR = os.getenv("OKF_DATASETS_DIR")
KNOWLEDGE_ROOT = (
    Path(_OKF_DATASETS_DIR).parent if _OKF_DATASETS_DIR else REPO_ROOT / "knowledge"
)

STATE_FILE = DATALAB_DIR / "game-labels.state.json"

MIN_NEW_LABELS = 5

# One renderer per label kind (Spec 0031 §3 / §7): each label becomes one
# text doc + chunk — a short, human-readable serialization of the fields
# the studio games actually emit.
KIND_TEXT = {
    "triplet": lambda l: (
        f"anchor: {l.get('anchor', '')} | positive: {l.get('positive', '')} "
        f"| hard-negative: {l.get('hardNegative', '')}"
    ),
    "edge": lambda l: (
        f"a: {l.get('a', '')} | b: {l.get('b', '')} | chosen-over: "
        f"{', '.join(str(x) for x in (l.get('chosenOver') or []))}"
    ),
    "ranking": lambda l: (
        f"query: {l.get('query', '')} | winner: {l.get('winner', '')} "
        f"| loser: {l.get('loser', '')}"
    ),
    "path": lambda l: (
        f"path: {' -> '.join(str(x) for x in (l.get('path') or []))} "
        f"| score: {l.get('score', '')}"
    ),
}

KIND_NAMES = {
    "triplet": "hard-negative triplets (Beat the Baseline)",
    "edge": "graph edges (Leylines)",
    "ranking": "margin-ranking preferences (The Verdict)",
    "path": "scored paths (Leylines finish)",
}

PROVENANCE_LINE = (
    "Human-in-the-loop labels harvested from the Blue Hen studio games "
    "(Spec 0031); player provenance preserved; agent-generated labels are "
    "volume floor, human labels quality ceiling."
)


def _load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            log.warning("game-labels state file unreadable — starting fresh")
    return {"files": {}, "pending": {}, "rolled": {}}


def _save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def _estimate_tokens(text: str) -> int:
    # ~4 chars/token — the heuristic used everywhere else in the platform
    # (see packages/datalab/datalab/chunk.py `_estimate_tokens`).
    return max(1, len(text) // 4)


def _scan_new_labels(state: dict) -> dict[str, list[dict]]:
    """Read each inbox exhaust-*.jsonl past its stored line offset; group
    NEW payload.label events by kind. The offset always advances to the
    file's current length (recognized label or not) so no line is ever
    rescanned — that's what makes the "NEW labels since last roll" count
    monotonic across calls."""
    inbox = DATALAB_DIR / "inbox"
    new_by_kind: dict[str, list[dict]] = {}
    files_state = state.setdefault("files", {})
    if not inbox.exists():
        return new_by_kind
    for path in sorted(inbox.glob("exhaust-*.jsonl")):
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError:
            continue
        offset = int(files_state.get(path.name, 0))
        for line in lines[offset:]:
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            payload = row.get("payload") or {}
            label = payload.get("label") or {}
            kind = label.get("kind")
            if kind in KIND_TEXT:
                new_by_kind.setdefault(kind, []).append({
                    "label": label,
                    "player": payload.get("player") or "human",
                    "event": payload.get("event") or kind,
                    "collectedAt": row.get("ts") or datetime.now(timezone.utc).isoformat(),
                })
        files_state[path.name] = len(lines)
    return new_by_kind


def _dataset_dir(kind: str) -> Path:
    return DATALAB_DIR / f"game-labels-{kind}"


def _write_dataset(kind: str, buffered: list[dict]) -> dict:
    """Append `buffered` labels to (or create) the game-labels-<kind>
    dataset dir, in the exact docs.jsonl/chunks.jsonl/manifest.json layout
    `sync_from_datalab()` reads. Existing lines are preserved verbatim —
    this only ever appends."""
    from datalab.schemas import Chunk, DatasetManifest, SourceDoc

    slug = f"game-labels-{kind}"
    out_dir = _dataset_dir(kind)
    out_dir.mkdir(parents=True, exist_ok=True)

    docs_path = out_dir / "docs.jsonl"
    chunks_path = out_dir / "chunks.jsonl"
    existing_docs = docs_path.read_text(encoding="utf-8").splitlines() if docs_path.exists() else []
    existing_chunks = chunks_path.read_text(encoding="utf-8").splitlines() if chunks_path.exists() else []

    new_doc_lines: list[str] = []
    new_chunk_lines: list[str] = []
    for i, item in enumerate(buffered):
        text = KIND_TEXT[kind](item["label"])
        meta = {
            "player": item["player"],
            "event": item["event"],
            "collectedAt": item["collectedAt"],
        }
        uri = f"game-label:{kind}:{len(existing_docs) + i}:{item['collectedAt']}"
        doc = SourceDoc.from_content(
            uri=uri,
            markdown=text,
            kind="text",
            title=f"{kind} label ({item['player']})",
            retrieved_at=item["collectedAt"],
            meta=meta,
        )
        chunk_id = hashlib.sha256(f"{doc.doc_id}:0:{text[:64]}".encode("utf-8")).hexdigest()[:16]
        chunk = Chunk(
            chunk_id=chunk_id,
            doc_id=doc.doc_id,
            ordinal=0,
            text=text,
            token_estimate=_estimate_tokens(text),
            strategy="game-label",
            meta=meta,
        )
        new_doc_lines.append(doc.model_dump_json())
        new_chunk_lines.append(chunk.model_dump_json())

    all_docs = existing_docs + new_doc_lines
    all_chunks = existing_chunks + new_chunk_lines
    docs_path.write_text("\n".join(all_docs) + "\n", encoding="utf-8")
    chunks_path.write_text("\n".join(all_chunks) + "\n", encoding="utf-8")

    manifest_path = out_dir / "manifest.json"
    created_at = datetime.now(timezone.utc)
    if manifest_path.exists():
        try:
            prev = DatasetManifest.model_validate(
                json.loads(manifest_path.read_text(encoding="utf-8")))
            created_at = prev.created_at
        except Exception:
            pass

    manifest = DatasetManifest(
        dataset_id=slug,
        name=f"Game labels — {KIND_NAMES.get(kind, kind)}",
        created_at=created_at,
        sources=["dumbmodel", "research", "validation"],
        doc_count=len(all_docs),
        chunk_count=len(all_chunks),
        chunk_strategy="game-label",
        extractor="heuristic",
        vector_store=None,
        okf_card=f"datasets/{slug}.md",
        stats={"newThisRoll": len(buffered), "kind": kind},
    )
    manifest_path.write_text(manifest.model_dump_json(indent=2), encoding="utf-8")

    _write_okf_card(slug, kind, manifest)
    return {
        "slug": slug,
        "docCount": len(all_docs),
        "chunkCount": len(all_chunks),
        "newThisRoll": len(buffered),
    }


def _write_okf_card(slug: str, kind: str, manifest) -> None:
    from datalab.okf import Bundle

    bundle = Bundle(KNOWLEDGE_ROOT)
    new_this_roll = manifest.stats.get("newThisRoll", 0)
    body = f"""# Provenance

{PROVENANCE_LINE}

{manifest.doc_count} label(s) rolled to date ({new_this_roll} new this
roll). Raw artifacts live at `data/datalab/{slug}/` (docs.jsonl,
chunks.jsonl, manifest.json) — one label per doc/chunk; `meta.player`
distinguishes human vs. agent contributions, `meta.event` names the
originating game action, `meta.collectedAt` is the exhaust event
timestamp.

# Sources

Studio games emitting this label kind, routed through `/v1/exhaust`
(consent required): dumbmodel (Beat the Baseline), research (Leylines),
validation (The Verdict).

# Consumption

Feeds the refinery catalog and, once a kind crosses its verified
threshold, the corresponding MTNN loss head (Spec 0031 §4).
"""
    bundle.write_concept(
        f"datasets/{slug}",
        type="Dataset",
        title=manifest.name,
        description=f"Game-label roll-up: {manifest.doc_count} labels ({kind}).",
        tags=["dataset", "datalab", "game-labels", kind],
        body=body,
        extra={"datasetId": slug},
    )
    bundle.add_index_entry(
        "datasets", manifest.name, f"{slug}.md",
        f"{manifest.doc_count} labels ({kind})", section="Datasets",
    )
    bundle.append_log(
        f"Rolled {new_this_roll} new {kind} label(s) into "
        f"[{manifest.name}](/datasets/{slug}.md) ({manifest.doc_count} total).",
        kind="Creation",
    )


def roll_game_labels() -> dict:
    """Spec 0031 §3 (GAME-006): scan the exhaust inbox for payload.label
    events, group by kind, and once a kind has >=5 NEW labels since its
    last roll, write/refresh its game-labels-<kind> dataset dir and sync
    the catalog + wiki (the harvest pattern). Idempotent; never deletes —
    kinds under threshold just keep accumulating in the state file's
    pending buffer until the next call clears them."""
    state = _load_state()
    new_by_kind = _scan_new_labels(state)

    pending = state.setdefault("pending", {})
    for kind, items in new_by_kind.items():
        pending.setdefault(kind, []).extend(items)

    rolled = state.setdefault("rolled", {})
    written: dict[str, dict] = {}
    for kind, buffer in list(pending.items()):
        if len(buffer) < MIN_NEW_LABELS:
            continue
        result = _write_dataset(kind, buffer)
        written[kind] = result
        rolled[kind] = {
            "totalCount": result["docCount"],
            "lastRollAt": datetime.now(timezone.utc).isoformat(),
        }
        pending[kind] = []

    _save_state(state)

    synced = None
    if written:
        from app.services.catalog import sync_from_datalab

        synced = sync_from_datalab()
        try:
            from app.services.wiki import rebuild_wiki

            rebuild_wiki()
        except Exception as exc:
            log.warning("wiki rebuild after game-label roll failed: %s", exc)

    return {
        "written": written,
        "pendingCounts": {k: len(v) for k, v in pending.items()},
        "synced": synced,
    }

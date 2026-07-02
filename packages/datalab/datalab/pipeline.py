"""Collection pipeline: sources → docs → chunks → (vectors) → manifest + OKF card."""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path

from datalab.chunk import chunk_text
from datalab.ingest import ingest
from datalab.observe import Trace
from datalab.okf import Bundle
from datalab.schemas import Chunk, DatasetManifest, SourceDoc


def _repo_root() -> Path:
    """Nearest ancestor with a .git directory, else the cwd."""
    cur = Path.cwd().resolve()
    for candidate in (cur, *cur.parents):
        if (candidate / ".git").exists():
            return candidate
    return cur


def _data_root() -> Path:
    env = os.environ.get("DATALAB_DIR")
    return Path(env) if env else _repo_root() / "data" / "datalab"


def _knowledge_root() -> Path:
    env = os.environ.get("OKF_BUNDLE_DIR")
    return Path(env) if env else _repo_root() / "knowledge"


@dataclass
class CollectionRun:
    manifest: DatasetManifest
    docs: list[SourceDoc] = field(default_factory=list)
    chunks: list[Chunk] = field(default_factory=list)
    out_dir: Path | None = None


def run_collection(
    sources: list[str],
    name: str,
    *,
    max_tokens: int = 512,
    strategy: str = "auto",
    data_root: str | Path | None = None,
    knowledge_root: str | Path | None = None,
    trace: Trace | None = None,
) -> CollectionRun:
    """Run one point-in-time collection and persist docs, chunks, manifest, OKF card.

    Layout: data/datalab/<dataset_id>/{docs.jsonl, chunks.jsonl, manifest.json}
    OKF card: knowledge/datasets/<dataset_id>.md (+ index/log updates)
    """
    trace = trace or Trace(f"collect:{name}")
    docs, failures = ingest_sources(sources, trace=trace)
    return materialize_collection(
        docs,
        name,
        sources=sources,
        failures=failures,
        max_tokens=max_tokens,
        strategy=strategy,
        data_root=data_root,
        knowledge_root=knowledge_root,
        trace=trace,
    )


def ingest_sources(
    sources: list[str], *, trace: Trace | None = None
) -> tuple[list[SourceDoc], list[dict[str, str]]]:
    """Ingest each source; failures are recorded, not fatal."""
    trace = trace or Trace.noop()
    docs: list[SourceDoc] = []
    failures: list[dict[str, str]] = []
    for src in sources:
        with trace.span("ingest", {"source": src}) as span:
            try:
                doc = ingest(src)
            except Exception as e:
                span.note({"error": str(e)[:200]})
                failures.append({"source": src, "error": str(e)[:200]})
                continue
            docs.append(doc)
            span.note({"docId": doc.doc_id, "chars": len(doc.markdown)})
    return docs, failures


def materialize_collection(
    docs: list[SourceDoc],
    name: str,
    *,
    sources: list[str],
    failures: list[dict[str, str]] | None = None,
    max_tokens: int = 512,
    strategy: str = "auto",
    data_root: str | Path | None = None,
    knowledge_root: str | Path | None = None,
    trace: Trace | None = None,
) -> CollectionRun:
    """Chunk already-ingested docs and persist a point-in-time dataset."""
    trace = trace or Trace(f"collect:{name}")
    failures = failures or []
    dataset_id = f"{time.strftime('%Y%m%d-%H%M%S')}-{_slug(name)}"
    run = CollectionRun(
        manifest=DatasetManifest(dataset_id=dataset_id, name=name, sources=list(sources)),
        docs=list(docs),
    )

    for doc in run.docs:
        with trace.span("chunk", {"docId": doc.doc_id}) as span:
            cs = chunk_text(doc.doc_id, doc.markdown, max_tokens=max_tokens, strategy=strategy)
            run.chunks.extend(cs)
            span.note({"chunks": len(cs)})

    m = run.manifest
    m.doc_count = len(run.docs)
    m.chunk_count = len(run.chunks)
    m.chunk_strategy = run.chunks[0].strategy if run.chunks else strategy
    m.stats = {
        "failures": failures,
        "totalTokensEst": sum(c.token_estimate for c in run.chunks),
        "traceId": trace.trace_id,
    }

    out_dir = Path(data_root or _data_root()) / dataset_id
    out_dir.mkdir(parents=True, exist_ok=True)
    _write_jsonl(out_dir / "docs.jsonl", (d.model_dump_json() for d in run.docs))
    _write_jsonl(out_dir / "chunks.jsonl", (c.model_dump_json() for c in run.chunks))
    run.out_dir = out_dir

    # No knowledge card for an empty collection: a run where every source
    # failed is a failure record (manifest.json), not a dataset.
    if run.docs:
        m.okf_card = _write_okf_card(run, Bundle(knowledge_root or _knowledge_root()))
    (out_dir / "manifest.json").write_text(m.model_dump_json(indent=2), encoding="utf-8")
    return run


def _write_okf_card(run: CollectionRun, bundle: Bundle) -> str:
    m = run.manifest
    concept_id = f"datasets/{m.dataset_id}"
    sources_md = "\n".join(f"| `{s}` | {'ok' if all(f['source'] != s for f in m.stats.get('failures', [])) else 'failed'} |"
                           for s in m.sources)
    body = f"""# Provenance

Point-in-time collection run `{m.dataset_id}` — {m.doc_count} documents,
{m.chunk_count} chunks ({m.chunk_strategy} strategy,
~{m.stats.get('totalTokensEst', 0)} tokens). Raw artifacts live at
`data/datalab/{m.dataset_id}/` (docs.jsonl, chunks.jsonl, manifest.json);
trace `{m.stats.get('traceId', 'n/a')}` in `data/traces/`.

# Sources

| Source | Status |
|--------|--------|
{sources_md}

# Consumption

Chunks feed the training worker's pair builder and the retrieval index.
Filter on `token_estimate` and `strategy` in `chunks.jsonl`. See the
[data pipeline](/platform/data-pipeline.md) concept for stage details.
"""
    bundle.write_concept(
        concept_id,
        type="Dataset",
        title=m.name,
        description=f"Point-in-time collection: {m.doc_count} docs, {m.chunk_count} chunks.",
        tags=["dataset", "datalab"],
        body=body,
        extra={"datasetId": m.dataset_id},
    )
    bundle.add_index_entry(
        "datasets", m.name, f"{m.dataset_id}.md",
        f"{m.doc_count} docs, {m.chunk_count} chunks", section="Datasets",
    )
    bundle.append_log(
        f"Collected dataset [{m.name}](/datasets/{m.dataset_id}.md) "
        f"({m.doc_count} docs, {m.chunk_count} chunks).",
        kind="Creation",
    )
    return f"{concept_id}.md"


def _write_jsonl(path: Path, lines) -> None:
    with path.open("w", encoding="utf-8") as fh:
        for line in lines:
            fh.write(line + "\n")


def _slug(text: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "-" for c in text.lower()).strip("-")[:48]


def list_datasets(data_root: str | Path | None = None) -> list[DatasetManifest]:
    root = Path(data_root or _data_root())
    out: list[DatasetManifest] = []
    if not root.exists():
        return out
    for d in sorted(root.iterdir(), reverse=True):
        mf = d / "manifest.json"
        if mf.exists():
            try:
                out.append(DatasetManifest.model_validate(json.loads(mf.read_text(encoding="utf-8"))))
            except Exception:
                continue
    return out

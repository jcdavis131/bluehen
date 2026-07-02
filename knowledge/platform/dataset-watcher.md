---
type: Pipeline
title: Continuous Dataset Builder (datalab watch)
description: Always-listening collection loop — cadenced sources, content-hash dedupe, point-in-time datasets, auto-growing OKF dataset library.
resource: /packages/datalab/datalab/watch.py
tags: [data, pipeline, watcher, datalab]
timestamp: 2026-07-02T00:00:00Z
---

The "listening" half of the [data pipeline](/platform/data-pipeline.md).
A source registry drives cadenced collection; the OKF dataset library in
[/datasets/](/datasets/index.md) grows only when source content actually
changes.

# How it works

1. **Registry** — `config/datalab_sources.json`: each source has `urls`
   and/or a repo-relative `glob`, an `intervalMinutes` cadence, and
   chunking parameters (defaults block applies when unset).
2. **Scheduling** — `data/datalab/watch_state.json` records per-source
   `lastRunAt`; a tick runs only due sources.
3. **Refinement / dedupe** — every `SourceDoc` id is a content hash; the
   sorted-id fingerprint is compared to the last materialized run. Same
   fingerprint → `unchanged`, nothing written. Changed → a **new**
   point-in-time dataset (never mutated in place), with its own OKF card,
   index entry, and log line.
4. **Fault isolation** — a failing source is reported and skipped; the
   loop continues. Empty collections produce no dataset card.

# Running

```powershell
uv run python -m datalab watch --once    # one pass (cron / scheduled agent)
uv run python -m datalab watch           # long-running daemon (60 s poll)
```

Keep it constantly listening on the dev box with a scheduled task or an
agent loop (same pattern as `research-loop.ps1`); in Docker, run it as a
sidecar command — the image already sets `DATALAB_DIR=/data/datalab`.

# Growing the library

Add a source block to the registry — no code. R&D consumption path:
`data/datalab/<dataset_id>/chunks.jsonl` feeds pair builders and retrieval
indexes; the OKF card carries provenance for [EVIDENCE.md](/../EVIDENCE.md)
citations.

# Citations

[1] [Watcher implementation](/../packages/datalab/datalab/watch.py)
[2] [Source registry](/../config/datalab_sources.json)
[3] [Scheduling + dedupe tests](/../packages/datalab/tests/test_watch.py)

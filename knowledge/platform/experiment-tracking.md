---
type: Service
title: Experiment Tracking (runboard)
description: W&B-style run tracking — JSONL metric store, ASN telemetry (effective rank, R2D curvature), collapse alerts.
resource: /packages/runboard
tags: [training, telemetry, runboard, asn]
timestamp: 2026-07-02T00:00:00Z
---

Lightweight experiment tracking with the same philosophy as OKF: plain
files, readable without tooling, diffable in git.

# Run layout

```
data/runs/<run_id>/
    manifest.json    # project, config, tags, status, summary
    metrics.jsonl    # {"step", "ts", "metrics": {...}}
    events.jsonl     # surgery triggers, collapse alerts, checkpoints
```

# API

```python
import runboard

run = runboard.init(project="autoresearch", name="ar-306-gelu", config=recipe)
run.log({"train/loss": 0.42, "asn/effective_rank": er}, step=step)
run.log_event("surgery", "spectral surgery triggered", {"tier": 2})
run.finish()
```

# ASN telemetry

* `runboard.effective_rank(X)` — variance-based Shannon-entropy effective
  rank (numpy; definition matches `asn_engine.spectral.effective_rank`).
* `runboard.r2d_curvature(layer_ranks)` — Representational-to-Depth
  curvature (second difference across depth); near-zero spans mark
  redundant blocks.
* `runboard.RankMonitor` — streaming collapse detector: alerts below an
  absolute floor or on a sharp drop vs. recent median; alerts land in
  `events.jsonl` and light up the [training console](/platform/training-console.md).

# Metric naming

Prefix convention: `train/*`, `eval/*`, `asn/*` (rank + curvature),
`sys/*` (reserved for host stats). The console groups charts by prefix.

# Consumption

Read via the [telemetry API](/platform/core-api-telemetry.md), the local
dev server (`uv run python -m runboard serve`, :8100), or directly from
disk. `uv run python -m runboard demo` seeds a synthetic run (tagged
`demo`) for dashboard development — demo runs are never evidence.

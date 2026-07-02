---
type: API Endpoint
title: Telemetry API (/v1/runs, /v1/datalab)
description: Read-only training-run and dataset telemetry on core-api, tenant-authenticated.
resource: /services/core-api/app/services/telemetry.py
tags: [api, telemetry, core-api]
timestamp: 2026-07-02T00:00:00Z
---

Read-only views over [runboard](/platform/experiment-tracking.md) runs and
[datalab](/platform/data-pipeline.md) datasets. All endpoints are
**admin-only** (`require_admin`): the filesystem stores are platform-wide,
not tenant-namespaced, so workspace keys must not enumerate them — see
[security review](/reviews/security.md) SEC-001/002. Opening these to
tenant keys requires tenant-scoped stores (spec needed).

# Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/runs?project=&limit=` | List run manifests, newest first |
| GET | `/v1/runs/{run_id}` | One run manifest (config, summary, status) |
| GET | `/v1/runs/{run_id}/metrics?after=&limit=` | Metric rows; `after` enables live tail polling |
| GET | `/v1/runs/{run_id}/events?after=` | Events (surgery, collapse alerts) |
| GET | `/v1/datalab/datasets` | Dataset manifests from collection runs |

# Live tail contract

Clients poll `metrics?after=<rows_seen>`; the server returns only new
rows (`after` is a row offset, not a step). The training console polls
every 3 s while a run's status is `running`.

# Local development

Without Docker/Postgres, use the standalone reader on :8100 (no auth,
CORS open, GET-only — dev machines only):

```powershell
uv run python -m runboard serve
```

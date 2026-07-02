---
type: Review
title: Backend Architecture Review
description: Service boundaries, filesystem-store tradeoffs, deploy readiness of core-api, worker, runboard, and datalab.
tags: [review, backend, architecture]
timestamp: 2026-07-02T15:31:41Z
reviewer: backend-sme
status: living
---

# Charter

Living architecture review of the Python backend: `services/core-api` (FastAPI +
Postgres/pgvector, tenant RLS), `services/worker` (training job consumer),
[experiment tracking](/platform/experiment-tracking.md) (`packages/runboard`),
the [data pipeline](/platform/data-pipeline.md) (`packages/datalab`),
`packages/asn-engine`, the uv workspace, and the `infra/` + Railway deploy path.
Judged against Spec 0004 (core API contract) and Spec 0009 (worker lifecycle).

Convention: this document is extended over time. New findings are appended under
dated headings inside `# Findings`; resolved findings are struck through or
annotated in place; the frontmatter `timestamp` tracks the latest revision.
Findings explicitly distinguish **deliberate, documented tradeoffs** from
**gaps** (undocumented or contradicting the specs).

# Architecture Summary

```
Vercel fleet sites ──HTTPS──▶ core-api (FastAPI, Railway, $PORT)
                                │  auth.py: SHA-256 key → TenantCtx; admin HMAC compare
                                │  database.py: RLS GUC + SET LOCAL ROLE per session
                                ├──▶ Postgres/Neon (workspaces, collections, training_jobs,
                                │        model_versions, ledger, pgvector document_chunks)
                                ├──▶ data/runs/<run_id>/{manifest.json, metrics.jsonl,
                                │        events.jsonl}          ← runboard (filesystem store)
                                └──▶ data/datalab/<dataset_id>/{docs,chunks}.jsonl + manifest
                                         ← datalab (filesystem store, OKF cards → knowledge/)

worker (same Docker image, start cmd "worker")
    polls training_jobs (FOR UPDATE SKIP LOCKED, 2s)
    → asn_engine.train_asn → checkpoint → eval-harness → BD queue / charter-gated
      deploy → pgvector index → ledger stages (Spec 0012)
    imports core-api's app.* via sys.path insertion

training scripts / trainers (dev box, Modal)
    runboard.init/log/log_event → local disk → polled by console
      via core-api /v1/runs* (or `python -m runboard serve` :8100 in dev)
    datalab.run_collection: ingest (crawl4ai→httpx | marker→pypdf) → chunk
      (chonkie→sentence) → store (Qdrant→numpy) → Trace JSONL (→ Langfuse)
```

# Findings

## 2026-07-02

| ID | Severity | Finding | Location |
|----|----------|---------|----------|
| BE-001 | high | Docker build/image excludes new workspace members (runboard, datalab, omni-sim) that core-api now requires | `Dockerfile`, `infra/Dockerfile.core-api`, `infra/Dockerfile.worker`, `services/core-api/pyproject.toml` |
| BE-002 | high | Filesystem run/dataset store is single-host; Railway disk is ephemeral and trainers write on other machines — prod `/v1/runs` will be empty or stale | `packages/runboard/runboard/store.py`, `services/core-api/app/services/telemetry.py`, `infra/railway.md` |
| BE-003 | high | `/readyz` missing from `app/main.py` while Spec 0004, `test_readyz`, and the prod smoke script all depend on it | `services/core-api/app/main.py`, `services/core-api/tests/test_workspaces.py:33`, `scripts/prod-deploy.mjs:116` |
| BE-004 | medium | Telemetry endpoints are authenticated but not tenant-scoped — any workspace key reads all runs/datasets | `services/core-api/app/main.py:358-408`, `app/services/telemetry.py` |
| BE-005 | medium | No stuck-job recovery: a worker crash strands jobs in `running` forever (no lease, heartbeat, or retry) | `services/core-api/app/services/jobs.py:59-80`, `services/worker/main.py` |
| BE-006 | medium | Worker reaches into core-api internals via `sys.path` hack; worker is not a workspace member or package | `services/worker/main.py:12` |
| BE-007 | medium | Concurrent-writer hazards in filesystem stores: `LocalVectorStore.upsert` read-modify-write can misalign payloads/matrix; OKF `log.md`/`index.md` edits are non-atomic | `packages/datalab/datalab/store.py:42-52`, `packages/datalab/datalab/okf.py:86-123` |
| BE-008 | medium | Startup swallows all schema errors; `/healthz` never checks the DB; entrypoint continues past failed migrations | `services/core-api/app/main.py:25-38`, `infra/docker-entrypoint.sh` |
| BE-009 | medium | Stale nested lockfile `services/core-api/uv.lock` (2026-06-27, pre-runboard/datalab) shadows the root workspace lock; opt-in heavy adapters have no constraints file | `services/core-api/uv.lock`, `uv.lock`, `packages/datalab/pyproject.toml` |
| BE-010 | low | Several routes still take raw `dict` bodies; missing keys surface as 500s instead of 422s | `services/core-api/app/main.py:88-110,153,296-328,331-344` |
| BE-011 | low | Duplicated runs API: `runboard/api.py` router vs hand-rolled core-api routes — shapes/caps already drifting | `packages/runboard/runboard/api.py`, `services/core-api/app/main.py:358-401` |
| BE-012 | low | Polling live-tail cursor is a line offset (full re-scan per poll); `list_runs` re-parses every manifest per request | `packages/runboard/runboard/store.py:26-43,82-93` |
| BE-013 | low | Test gaps: no HTTP-level tests for `/v1/runs*` (auth + 404/400 mapping), no `runboard/api.py` router tests, no concurrency tests; Postgres-gated tests skip silently | `services/core-api/tests/test_telemetry.py`, `packages/runboard/tests/` |
| BE-014 | low | Langfuse passthrough uses the v2 `trace()` API against an unbounded `langfuse>=2.0` extra; v3 breaks it silently (exception swallowed by design) | `packages/datalab/datalab/observe.py:45-89` |

### BE-001 — Deploy image cannot build or serve the new surface (gap)

`services/core-api/pyproject.toml` now declares `runboard`, `datalab`, and
`omni-sim` as workspace dependencies, and the root workspace lists
`packages/datalab`, `packages/omni-sim`, `packages/runboard`, and
`services/trainer` as members. The root `Dockerfile` (which `railway.toml`
builds) copies only `packages/asn-engine`, `packages/eval-harness`,
`services/core-api`, and `services/worker` before `uv sync --all-packages` —
uv will fail on the missing member directories, so the image no longer builds;
even if the sync were made tolerant, `/v1/runs*`, `/v1/datalab/datasets`, and
`/v1/omni/*` import packages absent from the image. The build-time smoke check
(`python -c "import app.main"`) passes because `app/main.py` imports telemetry
lazily inside route bodies, so this would only surface at request time. The
`infra/Dockerfile.core-api` and `infra/Dockerfile.worker` variants are staler
still (they copy `eval-harness/pyproject.toml`, which is not even a workspace
member). This is the single biggest blocker to the next Railway deploy.

### BE-002 — Filesystem-as-database is fine locally, undefined multi-host (deliberate tradeoff + gap)

The plain-file design (per-run directory, `manifest.json` via atomic
`os.replace`, append-only JSONL, torn-tail-tolerant reader) is a deliberate,
well-documented philosophy ("plain files, readable without tooling, diffable in
git" — [experiment tracking](/platform/experiment-tracking.md)) and it is
well executed for a single writer on one machine. The gap is the deployment
story: `RUNBOARD_DIR`/`DATALAB_DIR` default to CWD-relative `data/runs` and
`data/datalab`; on Railway the container disk is ephemeral and the runbook
(`infra/railway.md`) only provisions a volume for `/data/artifacts`. Training
runs are written by scripts on the dev box or Modal — a different filesystem
from the core-api host — so production `/v1/runs` reads an empty directory.
Either (a) document runs as a local/dev surface and have the console fall back
to the :8100 dev server, (b) mount a shared volume and push run files to it, or
(c) plan the migration of manifests to Postgres (the summary/list view is
already relational-shaped) while keeping JSONL for bulk metric history.

### BE-003 — `/readyz` regression (gap)

Spec 0004 lists `GET /readyz` as implemented, `database.db_ping()` exists for
it, `tests/test_workspaces.py::test_readyz` asserts it, and
`scripts/prod-deploy.mjs --step smoke` curls it — but the current
`app/main.py` defines only `/healthz`. The test is decorated
`@requires_postgres`, so it skips silently on machines without Postgres,
hiding the regression. Combined with BE-008 (startup swallows schema failures,
`/healthz` reports `ok` regardless of DB state), the platform currently has
liveness but no readiness signal at all: Railway's health check will route
traffic to an instance whose database is down.

### BE-004 — Runs surface is authenticated, not isolated (gap)

Every other tenant route flows through `TenantCtx` into RLS-scoped queries.
The `/v1/runs*` and `/v1/datalab/datasets` routes require a valid workspace
key but then ignore it — `telemetry.list_runs()` returns every run on disk,
including other tenants' configs (recipes, hyperparameters) and metrics. Runs
have a `project` field but no workspace concept anywhere in the store. At
minimum, filter by a project↔workspace mapping in the core-api layer; ideally
add `workspaceId` to the manifest at `runboard.init()` time.

### BE-005 — Job queue has claim safety but no crash safety (gap)

`claim_next_job()` correctly uses `FOR UPDATE SKIP LOCKED` for multi-worker
claiming (Spec 0009), but the transition to `running` commits immediately and
nothing ever reclaims a `running` job. A worker OOM (real risk: ADR-002
recommends ≥4 GB for training) permanently strands the job and, from the
tenant's view, the training just hangs. Add `claimed_at` + a lease timeout
(requeue `running` jobs older than N minutes with a retry cap), or a heartbeat
column the worker touches per epoch.

### BE-006 — Worker/API boundary is a path hack (gap, acknowledged shape)

`services/worker/main.py` does `sys.path.insert(0, .../core-api)` and imports
`app.services.*` and `app.models` directly. Sharing the ORM layer between API
and worker is a reasonable modular-monolith choice at this stage — but it
should be expressed as a package (move shared models/services into a
`packages/`-level library, or make the worker part of the core-api
distribution) rather than path manipulation. As-is, the worker silently
couples to core-api's internal layout, is invisible to the uv workspace
(`services/worker` has no `pyproject.toml`), and cannot be typed-checked or
versioned independently.

### BE-007 — Single-writer assumption is implicit (gap)

Runboard itself is close to safe (atomic manifest replace; one-line appends;
reader tolerates torn tails — good). But `LocalVectorStore.upsert()` appends
payload lines and then rewrites `vectors.npy` from a full in-memory stack: two
concurrent upserts (or a crash between the two writes) leave payload rows and
matrix rows misaligned with no detection. `okf.py`'s `append_log`/
`add_index_entry` do read-modify-write on shared `log.md`/`index.md` — two
parallel collection runs can drop each other's entries. Acceptable if the
single-writer rule is stated and enforced (a lockfile via `os.open(O_CREAT|O_EXCL)`
is ~10 lines); today it is neither.

### BE-008 — Boot-time error handling hides failure (gap)

`on_startup` wraps `ensure_schema()` in `except Exception: pass` and
`docker-entrypoint.sh` continues past a failed `alembic upgrade head`
("migrate warning — continuing"). The tolerance is semi-deliberate (imports in
DB-less contexts; avoiding crash-loops), but combined with BE-003 there is no
point at which a misconfigured `DATABASE_URL` or failed migration becomes
visible before the first 500. Also note `@app.on_event("startup")` is
deprecated in current FastAPI — migrate to a lifespan handler when touching
this. Migration hygiene is otherwise good: 6 ordered Alembic revisions
including RLS policies, and a dedicated `migrate` entrypoint mode.

### BE-009 — Lockfile hygiene (mostly deliberate, one stray)

The good part is genuinely good and documented in two places
(`packages/datalab/pyproject.toml` comment, [data pipeline](/platform/data-pipeline.md)):
heavy adapters (crawl4ai, marker, litellm, instructor, outlines) are kept out
of the universal lock so their transitive pins (litellm→tokenizers,
marker→transformers) cannot constrain the training environment, and every
adapter has a pure-Python fallback so the pipeline runs from the lock alone.
Two residues: (1) `services/core-api/uv.lock` is a stale pre-workspace-refactor
lockfile (last committed 2026-06-27, before runboard/datalab existed) that uv
ignores in workspace mode but that will mislead humans and tooling — delete it;
(2) the opt-in adapters have no constraints/pin file, so "worked on my machine"
crawl4ai/marker results are not reproducible — a `constraints-adapters.txt`
would keep the deliberate lock exclusion while restoring reproducibility.

### BE-010..BE-014 — API consistency, duplication, tail design, tests

* **BE-010:** Spec 0004 already flags raw `dict` bodies as a risk. Concretely,
  `body["corpusUri"]` (`main.py:90`), `body["collectionId"]` (`:108`),
  `body["modelVersion"]` (`:156`), and `body["siteId"]` (`:299`) raise
  `KeyError` → 500 instead of a problem+json 422, breaking the otherwise
  consistent RFC 9457 error contract (`app/errors.py` is clean).
* **BE-011:** `runboard/api.py:build_router()` exists precisely so core-api
  could mount the runs surface, but `app/main.py` re-implements the four routes
  by hand through `app/services/telemetry.py`. The two copies already disagree
  (metrics `limit` cap 5000 vs 20000; core-api clamps `after`, the router does
  not). Mount the router behind the tenant dependency, or delete it.
* **BE-012:** Polling with an `after` line-offset cursor is a defensible
  choice over SSE/WebSocket for this scale (simple, stateless, cache-friendly),
  but the reader re-scans and discards all skipped lines each poll and
  `list_runs` re-parses every manifest per request. Cheap upgrades before
  reaching for SSE: byte-offset cursors, `os.scandir` + mtime-based manifest
  cache, `Cache-Control`/ETag on list responses.
* **BE-013:** Unit tests for runboard (round-trip, pagination, path-traversal
  rejection, telemetry math) and datalab (fallback adapters, OKF idempotency,
  end-to-end collection) are focused and honest. Missing: HTTP-level tests for
  `/v1/runs*` (auth enforcement, 400/404 mapping — current tests call the
  service layer directly), any test of `runboard/api.py`, and any concurrency
  or crash-recovery test for the filesystem stores. `@requires_postgres` skips
  make green local runs weaker evidence than they look (see BE-003).
* **BE-014:** `observe.py` mirrors spans via the Langfuse v2 `trace()` API
  under an unbounded `langfuse>=2.0` extra; the v3 SDK removed that API, and
  the by-design blanket `except` means the mirror dies silently. Pin `<3` or
  adapt. The local-JSONL-always design itself is sound.

# Recommendations

Prioritized; 1–3 gate the next production deploy.

1. **Fix the Docker build** (BE-001): copy all workspace members (or restructure
   COPY to `packages/` + `services/` metadata first), add datalab/runboard/
   omni-sim to the layer-1 metadata copy, reconcile or delete the stale
   `infra/Dockerfile.*` variants, and add a CI job that builds the image and
   smoke-hits `/v1/runs` so this class of drift fails fast.
2. **Restore `/readyz`** wired to `db_ping()` and make the entrypoint fail hard
   (or crash-loop with backoff) on migration failure (BE-003, BE-008). Point
   the Railway health check at `/readyz`.
3. **Decide the production story for the run store** (BE-002): short-term,
   document it as dev/local-host-only and hide the console panel in prod;
   medium-term, manifests → Postgres (tenant-scoped, solves BE-004 for free)
   with JSONL kept for bulk metric history.
4. **Tenant-scope `/v1/runs*` and `/v1/datalab/datasets`** (BE-004) — add
   `workspaceId` to run manifests and filter in the service layer.
5. **Add a job lease/requeue** with retry cap to `training_jobs` (BE-005) — one
   migration plus ~15 lines in `claim_next_job`.
6. **Promote shared worker/API code to a package** and give
   `services/worker` a `pyproject.toml` in the workspace (BE-006).
7. **Enforce single-writer on local stores** with a lockfile, and make
   `LocalVectorStore.upsert` write matrix-then-payloads with a count check
   (BE-007).
8. **Delete `services/core-api/uv.lock`**; add an adapter constraints file
   (BE-009). Mount `runboard.build_router` instead of hand-rolled routes
   (BE-011); convert remaining `dict` bodies to Pydantic models (BE-010).

# Watchlist

* Metric volume per run — line-offset polling and full-file rescans (BE-012)
  are fine below ~10⁵ lines/run; revisit cursors before long GPU runs on Modal.
* `embed_texts` checkpoint reload per call (Spec 0004 known risk) — becomes the
  latency ceiling as soon as any site sends real traffic; needs an LRU cache.
* `collections.meta` JSONB carrying full chunk/pair payloads (Spec 0004 risk) —
  watch row sizes; normalize at ingest before corpora grow.
* pgvector index type — sequential scan is fine at 8 chunks/org; add HNSW when
  chunk counts pass ~10⁴.
* Langfuse v3 migration (BE-014) and chonkie/crawl4ai API churn in the
  unpinned adapter tier.
* Worker single-process throughput — one job at a time, 2s poll; fine for
  Phase A cadence, revisit when the queue is contended (Arq/Redis is already
  stubbed in env docs).
* `USE_MEMORY` mode drift — memory-mode code paths in `database.py`/services
  are only lightly tested against the Postgres behavior they emulate.

# Citations

* `services/core-api/app/main.py` · `app/database.py` · `app/models.py` · `app/auth.py` · `app/errors.py` · `app/config.py`
* `services/core-api/app/services/telemetry.py` · `app/services/jobs.py`
* `services/core-api/alembic/versions/` (001–006) · `services/core-api/tests/` · `services/core-api/uv.lock`
* `services/worker/main.py`
* `packages/runboard/runboard/{store,run,api,telemetry}.py` · `packages/runboard/tests/test_runboard.py` · `packages/runboard/pyproject.toml`
* `packages/datalab/datalab/{pipeline,ingest,chunk,store,observe,okf}.py` · `packages/datalab/tests/test_datalab.py` · `packages/datalab/pyproject.toml`
* `pyproject.toml` · `uv.lock` · `Dockerfile` · `infra/Dockerfile.core-api` · `infra/Dockerfile.worker` · `infra/docker-entrypoint.sh` · `infra/railway.md` · `railway.toml` · `railway.worker.toml`
* `specs/0004-core-api.md` · `specs/0009-training-worker-lifecycle.md`
* [experiment tracking](/platform/experiment-tracking.md) · [data pipeline](/platform/data-pipeline.md) · [core-api telemetry](/platform/core-api-telemetry.md) · [training console](/platform/training-console.md)

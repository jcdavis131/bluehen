# 0004 — Core API

- **Status:** Draft
- **Related specs:** 0002, 0003, 0005

## Problem
Mini-orgs need one stateless, scoped HTTP surface for serving embeddings and driving the
research loop, with tenant isolation enforced on every request.

## Goals
- FastAPI service with auth, tenant resolution, serving, ledger, and job submission.
- OpenAPI schema that generates `packages/sdk-ts`.

## Contract (v1 routes; all tenant-scoped by API key)
- `GET  /healthz` — liveness/readiness (unauthenticated).
- `POST /v1/workspaces` — create a mini-org; returns one-time API key. (Admin-scoped.)
- `POST /v1/embed` — `{ inputs: string[] }` → `{ vectors: number[][], model_version }`.
- `POST /v1/search` — `{ query, k }` → `{ hits: [{id, score, payload}] }` (pgvector ANN).
- `POST /v1/research/hill-climb` — enqueue an auto-research iteration (Spec 0005).
- `GET  /v1/ledger` — paginated experiment ledger for the workspace.
- `GET  /v1/models` — model versions + lineage for the workspace.

## Design
- **Auth:** `Authorization: Bearer <api_key>` for tenant routes; JWT for dashboard/admin.
  Middleware resolves `workspace_id`, sets the Postgres GUC for RLS, attaches it to request
  state.
- **Validation:** Pydantic v2 models; reject unknown fields.
- **Errors:** RFC 9457 problem+json `{type,title,status,detail,instance}`.
- **Rate limits:** per-workspace token bucket in Redis.
- **Async:** all I/O async; embedding inference proxied to the serving runtime; long jobs go
  to the Arq queue, never block the request.

## Data model
Uses `corporate_workspaces`, `auto_research_ledger` (Spec 0005), `model_versions`,
`documents`/`embeddings` (pgvector). All RLS-protected.

## Acceptance criteria
1. Every tenant route requires a valid key and is RLS-scoped.
2. `/v1/embed` returns deterministic vectors for a pinned model version.
3. OpenAPI schema is published and `sdk-ts` builds from it in CI.
4. Malformed payloads return problem+json with a 4xx and no stack trace.

## Test plan
- `tests/test_auth.py`, `tests/test_embed.py`, `tests/test_search.py`,
  `tests/test_errors.py`; integration with ephemeral Postgres+Redis in CI.

## Rollout & rollback
- Versioned under `/v1`; breaking changes ship `/v2`. Migrations gated in CI.

## Risks
- Serving latency under load → load test in Phase 4 with a p95 target; cache hot models.

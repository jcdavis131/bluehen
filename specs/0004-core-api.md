# 0004 — Core API

- **Status:** Implemented (v0.3)
- **Owner:** Platform
- **Related specs:** 0002, 0003, 0005, 0006, 0008, 0009
- **Implementation:** `services/core-api/app/`

## Problem

Mini-orgs need one HTTP surface for embeddings, search, training, eval, and governance — with
tenant isolation on every request.

## Goals

- FastAPI service: auth, tenant resolution, lifecycle routes, admin fleet view.
- Postgres persistence + pgvector search + RFC 9457 errors.
- OpenAPI published at `/docs` (sdk-ts generation TBD).

## Contract (v0.3)

### Public / admin

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/healthz` | none | Liveness |
| GET | `/readyz` | none | Readiness (Postgres ping; 503 if DB down) |
| POST | `/v1/workspaces` | admin bearer | Create workspace |
| GET | `/v1/admin/fleet` | admin bearer | Cross-org status |

### Tenant (Bearer workspace key or admin + `x-synth-workspace-id`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/data/ingest` | Load corpus → collection + chunks |
| POST | `/v1/data/chunk` | LMAR re-chunk collection |
| POST | `/v1/data/pairs` | Synthesize contrastive pairs |
| POST | `/v1/train/launch` | Enqueue training job |
| GET | `/v1/train/{job_id}` | Job status |
| POST | `/v1/eval/run` | Run eval-harness on checkpoint |
| GET | `/v1/eval/{model_version}/gates` | Gate snapshot |
| GET | `/v1/models` | Model registry |
| POST | `/v1/model/deploy` | Deploy + index chunks to pgvector |
| POST | `/v1/embed` | Embed texts (Matryoshka truncate optional) |
| POST | `/v1/search` | pgvector cosine search |
| POST | `/v1/research/hill-climb` | Full collect → train enqueue |
| GET/POST | `/v1/ledger` | Experiment ledger |
| GET | `/v1/budget` | Daily cost ceiling |
| POST | `/v1/trace` | Record span |
| GET | `/v1/trace/{trace_id}` | Replay trace |

### Request / response notes

- **Errors:** `application/problem+json` `{ type, title, status, detail }`.
- **Search:** optional `collectionId`; uses full 384-dim vectors in pgvector; embed API may truncate.
- **Deploy:** triggers `document_chunks` indexing via `app/services/indexing.py`.

## Design

- **Auth:** SHA-256 API key hash; admin via `API_SECRET_KEY` constant-time compare.
- **RLS:** `db_session(workspace_id)` sets GUC + tenant role (Spec 0002).
- **Jobs:** `training_jobs` queue consumed by `services/worker` (Spec 0009).
- **Artifacts:** checkpoints under `data/artifacts/{workspaceId}/`.

## Acceptance criteria

1. Every tenant route requires valid key and is RLS-scoped. ✅
2. `/v1/embed` returns vectors from deployed (or latest) checkpoint. ✅
3. `/v1/search` returns ranked hits from pgvector. ✅
4. Malformed payloads return problem+json 422. ✅ (`tests/test_rls.py`)
5. Phase A orgs: trained, deployed, indexed via API + scripts. ✅

## Test plan

- `services/core-api/tests/test_workspaces.py`
- `services/core-api/tests/test_rls.py`
- CI job `core-api` with Postgres service in `.github/workflows/ci.yml`

## Rollout & rollback

- Version prefix `/v1`; breaking changes ship `/v2`.
- **Local:** Postgres `:5433` via `pnpm dev:stack`.
- **Production:** Neon `DATABASE_URL` + Railway service `core-api` (ADR-002). Shared root
  `Dockerfile`; health checks `/healthz` (liveness) and `/readyz` (DB); `PORT` from Railway env.
- Migrations: `pnpm deploy:railway:migrate` locally, or `migrate` entrypoint on Railway release.
- After deploy: set `SYNTH_API_BASE_URL` on all Vercel fleet projects; bootstrap workspaces
  (`pnpm bootstrap:orgs`); push keys via `pnpm vercel:env-fleet:exec`.
- Runbook: [`infra/railway.md`](../infra/railway.md) · ADR: [`docs/adr/002-core-api-hosting.md`](../docs/adr/002-core-api-hosting.md).

## Risks

- Serving latency under load → IVFFlat/HNSW index when chunk counts grow (not yet implemented).
- Rate limits in Redis → stubbed in `.env.example`, not enforced in v0.3.
- **Model cache:** `embed_texts` reloads checkpoint per call — batch + cache required at scale
  (see `docs/wiki/ARCHITECTURE_REVIEW.md`).
- **Request validation:** several routes still accept raw `dict` bodies — migrate to Pydantic
  schemas with size limits.
- **Corpus in JSONB:** `collections.meta` stores full chunk payloads — normalize at ingest.

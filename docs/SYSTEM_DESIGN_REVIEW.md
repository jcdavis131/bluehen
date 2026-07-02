# System Design Review — Blue Hen RE (SynthaEmbed OS)

**Reviewer:** Claude (system-design pass) · **Date:** 2026-06-28 · **Scope:** `services/core-api`, `services/worker`, multi-tenant data model, retrieval path, fleet topology. Frontend apps and ASN math reviewed only at the interface boundary.

---

## 1. What this system is

A fleet-orchestrated, multi-tenant embeddings/RAG platform. One FastAPI service (`core-api`) is the uniform chokepoint; every site, agent, and CLI enters through the `synth-core` SDK. Each tenant ("mini-org") is isolated by `workspace_id` and runs an independent ingest → chunk → synth-pairs → ASN train → eval-gate → deploy → search lifecycle. Training is async via a Postgres job queue drained by a separate worker.

```
                 synth-core SDK (only entry)
                        │  Bearer key + x-synth-* trace headers
                        ▼
        ┌──────────────────────────────┐
 sites/ │        core-api (FastAPI)     │
 agent/ │  auth → RLS tenant ctx        │
 CLI    │  data / jobs / eval / search  │
        └───────┬───────────────┬───────┘
                │ enqueue        │ pgvector KNN
                ▼                ▼
      training_jobs (Postgres)   document_chunks (vector(384) + RLS)
                │ SELECT … FOR UPDATE SKIP LOCKED
                ▼
        services/worker  → train_asn → eval → deploy → ledger
                │
                ▼
        data/artifacts/{workspace}/  (checkpoints)
```

This is a coherent design. The chokepoint-plus-SDK decision is the right backbone for a fleet, and the lifecycle stages map cleanly onto API endpoints and ledger entries. The notes below are about hardening it for scale and closing a few correctness gaps — not a structural rethink.

---

## 2. Strengths (keep these)

- **Single chokepoint, single SDK.** `core-api` + `synth-core` as the only way in keeps auth, tracing, and tenancy in one place. This is what makes the fleet tractable.
- **Defense-in-depth tenancy.** Two independent mechanisms: application-level `WHERE workspace_id = :wid` *and* Postgres RLS (`set_config('app.workspace_id')` + `SET LOCAL ROLE synthaembed_tenant`). A dedicated `NOINHERIT` tenant role exists so policies bite even under a superuser connection (`003_tenant_role.py`). Most teams ship only the first layer.
- **Correct queue semantics.** `claim_next_job` uses `SELECT … FOR UPDATE SKIP LOCKED LIMIT 1` (`jobs.py:59`) — the textbook Postgres-as-queue pattern, safe to scale to N workers with no double-claim.
- **Serving tiers are cleanly separated.** Matryoshka truncate → L2-renormalize → int8 quant is isolated in `apply_serving_tier`, and the tiered path correctly pools on full vectors before re-ranking (`search.py:84+`). The math is in one place.
- **SDD discipline is real.** specs/ + plans/ + EVIDENCE.md, and the README honestly tags the core benefit claim as *Hypothesis*, not fact. Rare and valuable.

---

## 3. Findings (prioritized)

### P0 — No ANN index on the embedding column
`002_pgvector_chunks.py` creates btree indexes on `workspace_id` and `collection_id` but **none on `embedding vector(384)`**. Every `/v1/search` therefore runs an exact, sequential KNN scan (`ORDER BY embedding <=> :qvec`, `search.py:63`). For an embeddings platform this is the load-bearing query, and it's currently O(rows-in-workspace) per request. Fine at demo scale, cliff-edge as any tenant's corpus grows.

**Fix:** add an HNSW index (pgvector ≥0.5): `CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops)`. Because RLS already scopes rows, the planner still benefits. Validate recall against the current exact baseline (you have `eval-harness` — wire it as the gate). This is the highest-leverage single change in the repo.

### P1 — Worker deploys even when eval gates fail
In `worker/main.py:96-106`, `deploy_model(...)` is called **unconditionally**; the gate result only changes the ledger note string ("auto-deploy after gates" vs "gates pending"). The platform's entire pitch is "deploy gates (nDCG, effective rank)." Shipping on gate failure contradicts that and means a regressed model can reach serving.

**Fix:** gate the promotion. On failure, either skip `deploy_model` or deploy to a non-serving shadow tier and leave the previously-deployed version live. Make "deployed = serving" mean "passed gates."

### P1 — Stuck jobs are unrecoverable
`claim_next_job` flips a job to `running` with no lease, heartbeat, or `started_at`. If a worker crashes mid-train, the job is `running` forever — no reaper requeues it (`grep` for heartbeat/lease/reaper/started_at → none). Single worker today, but this is a silent-stall waiting to happen.

**Fix:** add `started_at`/`heartbeat_at`; a reaper (or the claim query) requeues `running` jobs older than a visibility timeout back to `pending`. Cap retries via an attempts counter to avoid poison-job loops.

### P1 — Cost ceiling is advisory only
`cost_ceiling_usd` / `spent_usd_today` exist and `spent_usd_today += cost` is recorded **after** work completes (`governance.py:83`), but there's no pre-flight check against the ceiling before `launch_train` / `hill-climb`, and nothing resets `spent_usd_today` daily. A runaway hill-climb can blow past budget and the counter never rolls over. Per CLAUDE.md this is a Phase C guardrail — currently not enforced.

**Fix:** check `spent_usd_today + estimatedCost <= cost_ceiling_usd` atomically before enqueue (reject with 402/429 otherwise); add a scheduled/lazy daily reset keyed on a `spent_date` column.

### P2 — RLS is not FORCEd, and the app connects as a role that bypasses it
RLS protects you only when the connection runs as `synthaembed_tenant`. The app login role `synth` has the tenant role granted *to* it (`GRANT synthaembed_tenant TO synth`) and is the table owner — owners **bypass RLS** unless `FORCE ROW LEVEL SECURITY` is set, which it isn't. So any tenant-scoped query that forgets `db_session(workspace_id)` (and thus the `SET LOCAL ROLE`) silently runs with full cross-tenant visibility. The app-level `WHERE workspace_id` is currently the real backstop; RLS is a softer second layer than it looks.

**Fix:** `ALTER TABLE … FORCE ROW LEVEL SECURITY` on every tenant table, and run the API as a non-owner login role that only inherits `synthaembed_tenant`. Then a forgotten GUC fails closed instead of leaking.

### P2 — `ensure_schema()` on startup creates tables without RLS, and swallows errors
`on_startup` calls `ensure_schema()` inside `try/except Exception: pass` (`main.py:30-33`). `ensure_schema` runs `Base.metadata.create_all` (`database.py:60`), which creates tables with **no RLS policies** — those only exist in Alembic. So a boot that skipped migrations yields a tenant-leaky schema, and the bare `except` hides it. Convenient in dev, dangerous as a default.

**Fix:** keep auto-create for dev only (gate on `ENVIRONMENT == development`); in other envs, refuse to serve if `tenant_isolation` policies are absent. At minimum, log the swallowed exception.

### P2 — Tiered re-rank does heavy work in pure Python
The edge/MRL path pulls ~`max(k*12, 64)` full 384-dim vectors per query, parses each from a pgvector string (`_parse_embedding`), and recomputes cosine in interpreted Python loops (`search.py:99-115`, `_cosine`). Correct, but CPU-bound and allocation-heavy on the hot path.

**Fix:** vectorize with numpy, or precompute truncated/quantized columns at index time so the tier query is itself an indexed ANN lookup rather than a Python rerank. Revisit once P0's index lands.

### P3 — Inconsistent request validation
Typed Pydantic models exist for some endpoints (`WorkspaceIn`, `TrainLaunchIn`) but `/v1/embed`, `/v1/search`, `/v1/data/*`, `/v1/eval/*`, `/v1/model/deploy` take raw `dict` and reach in with `body.get(...)`. You lose validation, clear 422s, and OpenAPI schema for exactly the endpoints external sites call most.

**Fix:** promote the hot-path bodies to Pydantic models. Cheap, mechanical, improves the SDK contract.

### P3 — `vector(384)` is hardcoded
`document_chunks.embedding` is fixed at 384 dims, but `model_versions` implies per-workspace models. A workspace that trains a different output dimension can't index. Latent coupling between "many models" and "one chunk schema."

**Fix:** if multi-dim is ever in scope, key the chunk table (or a per-model chunk table/partition) by embedding dim; otherwise document 384 as an explicit platform invariant so it's a decision, not an accident.

---

## 4. Scale & reliability outlook

| Dimension | Today | First bottleneck |
|---|---|---|
| Search latency | Exact KNN, no index | **P0** — degrades linearly per workspace corpus growth |
| Training throughput | 1 worker, SKIP LOCKED | Queue scales horizontally; add the stuck-job reaper (P1) before adding workers |
| Tenant isolation | App filter + RLS (not forced) | A forgotten `db_session(workspace_id)` leaks until P2 fixes land |
| Cost control | Post-hoc accounting | Unbounded spend until pre-flight gate (P1) |
| Failure recovery | Job → failed on exception | Crash mid-job = permanent `running` (P1) |

The queue and tenancy backbone scale; retrieval and the safety rails (gates, budget, job recovery) are where growth will hurt first.

## 5. What I'd revisit as it grows

- **Retrieval engine**: once HNSW lands, decide if pgvector carries you to your target corpus size or if a dedicated vector store becomes warranted. Don't pre-optimize — but instrument search latency now so the trigger is data, not vibes.
- **"Deployed" semantics**: make gate-pass the hard precondition for serving, then a blue/green or shadow-eval promotion path becomes natural.
- **Budget as a first-class control loop**: pre-flight check + daily reset + a ledger-driven alert when a workspace nears ceiling closes the Phase C guardrail end-to-end.

---

### Suggested sequencing
1. HNSW index + recall gate (P0)
2. Gate the deploy + stuck-job reaper (P1)
3. Pre-flight cost check + daily reset (P1)
4. FORCE RLS + non-owner app role + env-gated `ensure_schema` (P2)
5. Pydantic on hot-path endpoints, numpy rerank (P2/P3)

Each is independently shippable and (per your SDD flow) wants a short spec before code — the P0/P1 items in particular change observable behavior and deserve a one-paragraph spec + eval-harness check each.

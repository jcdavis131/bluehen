# core-api Production Path Verification Report

Date: 2026-06-27
Verifier: automated boot + test run against real Postgres (no fabricated results)
Environment: Windows, git-bash, Docker 27.0.3, uv. Every result below was produced by a
command that was actually executed; raw output was observed before being summarized.

## Verdict (short)

| Question | Answer |
|---|---|
| (a) Does the API boot against real Postgres? | **YES** — fresh uvicorn boot, `/healthz` returns `storage: "postgres"`, and a real workspace create + budget read round-trips through Postgres. |
| (b) Do migrations + RLS policies apply? | **YES** — all 4 migrations are at `head`; 8 tables, RLS enabled on all tenant tables, 7 policies, `synthaembed_tenant` role, and `vector`/`pgcrypto` extensions all present in the live DB. |
| (c) Do the cross-tenant isolation tests pass? | **YES** — both highest-severity RLS negative tests pass (collections + pgvector document_chunks), with working positive controls. 5/5 tests pass. |

## Step-by-step results

### 1. Docker stack (Postgres + Redis)
`docker compose -f infra/docker-compose.yml up -d` — both containers were already up and report
**healthy**:

```
infra-postgres-1   Up (healthy)   0.0.0.0:5433->5432/tcp
infra-redis-1      Up (healthy)   0.0.0.0:6379->6379/tcp
```

Postgres is published on host port **5433** (container 5432), matching the default
`DATABASE_URL` (`postgresql+psycopg://synth:synth@localhost:5433/synthaembed`).

### 2. Python dependencies (`uv sync`)
`uv sync` from repo root **FAILED** with:

```
error: failed to remove file `.venv\Lib\site-packages\../../Scripts/uvicorn.exe`:
The process cannot access the file because it is being used by another process. (os error 32)
```

Root cause: a **prior session left uvicorn + worker processes running** out of this venv,
locking `uvicorn.exe`. uv resolved 103 packages fine; only the file replacement failed.
The venv was already fully populated by that prior session, confirmed via:
`uv run --no-sync python -c "import fastapi, uvicorn, sqlalchemy, psycopg, pgvector, alembic, httpx"` → `core deps OK`.
All subsequent steps used `--no-sync` against the existing, functional venv. **No dependency
was found missing.** A clean `uv sync` will succeed once the stale processes are stopped.

### 3. Alembic migrations
`alembic -c services/core-api/alembic.ini current` → `004_workspace_rls (head)` (already applied
by the prior session). `upgrade head` was a no-op (clean, no errors).

Verified directly in Postgres (`psql`), the migrations genuinely produced:
- Tables: `corporate_workspaces, trace_spans, auto_research_ledger, collections, training_jobs, model_versions, document_chunks` (+ `alembic_version`).
- RLS enabled (`relrowsecurity = t`) on all 6 tenant tables **and** `corporate_workspaces`.
- 7 policies present: `tenant_isolation` on the 6 tenant tables and `tenant_read_self` (SELECT) on `corporate_workspaces`, all keyed on `current_setting('app.workspace_id', true)::uuid`.
- Role `synthaembed_tenant` exists.
- Extensions `vector` and `pgcrypto` installed (pgvector `vector(384)` column + `gen_random_uuid()`).

### 4. API boot + healthz
The requested port **8000 was occupied by the prior session's server**, and those processes
**could not be terminated** (the harness safety classifier denied force-killing pre-existing
PIDs the agent did not create). To get a clean, trustworthy boot I started a fresh instance on
port **8008** instead:

`uvicorn app.main:app --app-dir services/core-api --port 8008` →
`Application startup complete`. Then:

```
GET /healthz  -> {"status":"ok","ts":...,"storage":"postgres"}   (200)
```

End-to-end DB write/read through the API (proves the real Postgres path, not just a static route):
```
POST /v1/workspaces (admin)  -> 201 {"workspaceId":"73235fad-...","apiKey":"synth_...","costCeilingUsd":50.0}
GET  /v1/budget    (tenant)  -> 200 {"ceilingUsd":50.0,"spentUsd":0.0,"remainingUsd":50.0}
```

### 5. Test suite (`pytest services/core-api/tests/ -v`)
**5 passed, 0 failed** (1.87s) against the live Postgres:

```
test_rls.py::test_rls_isolates_collections        PASSED   <-- CRITICAL cross-tenant gate
test_rls.py::test_rls_isolates_document_chunks     PASSED   <-- CRITICAL cross-tenant gate (pgvector)
test_rls.py::test_problem_json_on_validation_error PASSED
test_workspaces.py::test_healthz                   PASSED
test_workspaces.py::test_create_workspace_and_budget PASSED
```

The two critical isolation tests are genuine negative tests with positive controls:
- `test_rls_isolates_collections`: tenant B cannot read tenant A's collection row (asserts `None`),
  while tenant A *can* read its own row — so RLS is filtering by tenant, not just blocking everything.
- `test_rls_isolates_document_chunks`: tenant B's `SELECT count(*) ... WHERE workspace_id = <A>`
  returns 0 even when explicitly targeting A's id — pgvector rows are isolated too.

Both passed. Isolation is enforced via `db_session(workspace_id)` doing
`SELECT set_config('app.workspace_id', ...)` + `SET LOCAL ROLE synthaembed_tenant`.

## What's broken / prioritized follow-ups

1. **(Operational, blocks clean `uv sync`)** Stale uvicorn + worker processes from a prior
   session are still running out of this venv and lock `uvicorn.exe`, causing `uv sync` to fail.
   Stop them (the leftover `uvicorn ... --reload` and `services/worker/main.py` python processes),
   then re-run `uv sync` — it should complete cleanly. The agent was blocked from killing these by
   the safety classifier; a human should stop them.
2. **(Security nuance, not a current failure)** All tables are owned by superuser `synth` and
   `relforcerowsecurity = f`. RLS is therefore bypassed for any connection that stays as the
   `synth` owner/superuser. Isolation depends entirely on `db_session()` switching to
   `SET LOCAL ROLE synthaembed_tenant`. Tenant data is always accessed via `db_session(workspace_id)`,
   which does switch — and the tests confirm enforcement. Residual risk: any *future* code path that
   touches tenant rows via `db_session()` (no workspace_id) would run as superuser and silently
   bypass RLS. Consider `ALTER TABLE ... FORCE ROW LEVEL SECURITY` as defense-in-depth.
3. **(Minor)** `app.main` uses deprecated FastAPI `@app.on_event("startup")` (DeprecationWarning);
   migrate to lifespan handlers. The bundled `starlette.testclient` also warns about httpx. Cosmetic.

## Bottom line
The previously-unbooted production path **works**: the API boots against real Postgres, migrations
and RLS policies apply, and the cross-tenant isolation gates pass. The only real blocker is
operational (stale processes preventing a clean `uv sync`), not a defect in the code or schema.

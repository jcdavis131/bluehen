# Structural architecture review (2026-06-29)

Summary of cross-agent review. Full narrative was produced in Cursor session; this page is the
durable index for specs and remediation.

## Critical violations (must fix)

1. **Model serving** — `embed_texts` reloads checkpoint + tokenizer on every call;
   `indexing.py` calls it per chunk. **Fix:** workspace model cache + batch embed + bulk insert.
2. **Corpus in JSONB** — full chunks/pairs stored in `collections.meta`. **Fix:** normalize to
   `document_chunks` at ingest; cap sizes at API boundary.
3. **Missing Pydantic schemas** — high-risk endpoints accept raw `dict`. **Fix:** schema-first
   bodies with limits on `k`, `inputs[]`, `corpusUri`.
4. **RLS not forced** — superuser bypass if `db_session()` called without workspace. **Fix:**
   `FORCE ROW LEVEL SECURITY` + separate DB roles.
5. **Default `API_SECRET_KEY`** — fail-fast in production.
6. **`ui-fleet` raw fetch** — violates Spec 0006; no trace headers. **Fix:** route through
   `synth-core` (ADR-003 intent).
7. **Tenant hill-climb** — expensive lifecycle without strong rate limits beyond budget check.

## Architectural debt (should fix)

- Worker coupled via `sys.path` (not uv workspace member)
- BD queue on filesystem (`content/fleet/bd/`) vs Postgres
- Monolithic `main.py` router
- Site route/layout duplication (partially solved via `ui-fleet/routes`)
- Redis in compose but unused
- `fleet.json` imported at TS build time via deep relative path

## Approved patterns

- Postgres RLS via `app.workspace_id` GUC + `synthaembed_tenant` role
- BFF keeps `SYNTH_API_KEY` server-side on Vercel
- Job queue `FOR UPDATE SKIP LOCKED`
- Charter gate on deploy (Spec 0012)
- RFC 9457 problem+json errors
- `ui-fleet/routes` consolidation
- `Synth` client design in `synth-core`
- Spec-driven work queue with explicit blockers

## Trace to specs

| Finding | Target spec |
|---------|-------------|
| Model cache, indexing | 0004, 0009 |
| synth-core adoption in BFF | 0006 |
| BD queue in Postgres | 0012 |
| Request validation | 0004 |
| Fleet dev/review scripts | 0007 |

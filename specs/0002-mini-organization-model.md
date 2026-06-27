# 0002 — Mini-Organization Model (Tenancy & Isolation)

- **Status:** Draft
- **Related specs:** 0001, 0004

## Problem
Each mini-org must be fully isolated (zero-trust between tenants) while sharing one codebase
and one database. Onboarding a new mini-org must be data-only — no code changes.

## Goals
- Hard isolation of rows, vectors, models, and cost between tenants.
- Onboard a mini-org via one API call + one Vercel deploy.
- Make "repurpose an existing Vercel site" a supported path.

## Non-goals
- Per-tenant database instances (we use one Postgres with RLS to start; revisit at scale).

## Design
- **Identity:** `workspace` row + a hashed API key (`api_key_hash`). The raw key is shown
  once on creation, never stored.
- **Isolation (defense in depth):**
  1. App layer resolves `workspace_id` from the key on every request.
  2. **Postgres Row-Level Security** policy on every tenant table keyed on a session GUC
     (`SET app.workspace_id = ...`) so even a query bug cannot cross tenants.
  3. Vector store namespacing by `workspace_id` (pgvector: a `workspace_id` column in the
     RLS policy; Qdrant: a per-tenant collection).
- **Cost sovereignty:** `RESEARCH_COST_CEILING_USD_PER_DAY` per workspace, enforced by the
  Conductor (Spec 0005).
- **Repurposing existing Vercel sites:** a site becomes a mini-org by (a) creating a
  workspace, (b) setting `NEXT_PUBLIC_API_BASE_URL` + the scoped key, (c) conforming its
  data calls to the `sdk-ts` client. No engine changes.

## Data model
- `corporate_workspaces(id uuid pk, name, api_key_hash unique, cost_ceiling_usd numeric,
  created_at)`
- RLS enabled on all tenant tables; policy `USING (workspace_id = current_setting('app.workspace_id')::uuid)`.

## Acceptance criteria
1. Creating a workspace returns a one-time API key; only its hash is persisted.
2. A request with workspace A's key can never read/write workspace B's rows or vectors.
3. Disabling app-layer scoping still yields zero cross-tenant rows (RLS proven independently).
4. A new mini-org is onboarded with no code change.

## Test plan
- `tests/test_tenancy.py`: key hashing, resolution, one-time reveal.
- `tests/test_rls.py`: **negative tests** — direct DB queries as tenant A cannot see tenant
  B even with app scoping bypassed.
- e2e: two workspaces, concurrent writes, isolation asserted.

## Rollout & rollback
- Alembic migration adds tables + RLS policies; rollback drops policies then tables.

## Risks
- RLS misconfiguration is the highest-severity bug class → covered by mandatory negative
  tests in CI; this gate blocks Phase 3.

# Spec 0024 — Tenant metadata contracts: consistent filtering over JSONB

**Status:** Active (Operator architecture dialogue, 2026-07-04)
**Refines:** Spec 0023 (flywheel) · 0025 (engine) · Owner: Claude

## Problem

JSONB metadata gives tenants schema freedom; unmanaged, it destroys
downstream consistency — filters couple to one tenant's shape, indexes
don't exist for the fields queries hit, and drift is silent.

## Design (contracts at the boundary)

1. **`tenant_meta_contracts`** (workspace_id, version, json_schema,
   filterable jsonb, created_at; append-only). Active contract = max
   version. Registered at onboarding via `POST /v1/contracts` (tenant).
2. **Ingest validation:** every document/chunk metadata payload is
   validated against the tenant's active contract at write time — reject
   loud (400 with the schema path), never coerce silently. Rejections
   metered (`contract-reject`) → visible on hq ops.
3. **Reserved namespace `_bh.*`** (source, docId, ts, consent, lang):
   fixed types platform-wide; pipelines may depend ONLY on `_bh.*` +
   contract-declared fields.
4. **Filterable declarations compile:** for each declared filterable
   field {name, type: keyword|number|date|geo}, onboarding creates the
   partial expression index; the `/v1/recommend` filter DSL validates
   against the declarations before SQL. Undeclared field in a filter =
   400 naming the contract version.
5. **Evolution:** additive fields → same-major new version; type change →
   new version + backfill job; pipelines pin contract version. Geo type
   gates on PostGIS/earthdistance adoption (Operator infra call).

## Isolation-tier note (from the same dialogue)

Default remains shared-table + RLS (proven, migration-cheap). A
**schema-per-tenant enterprise tier** is sanctioned for tenants needing
custom DDL/index topology (anchor tenant candidate); tier choice lives
on the workspace row. HNSW indexes: add when row counts justify
(SCALE-001), per-tier strategy (global w/ filtering vs per-schema).

## Tasks

RECO-004 (contracts table + ingest validation + reserved namespace),
RECO-005 (filter DSL in /v1/recommend compiled from contracts),
SCALE-001 (HNSW + adapter-cache sizing when tenant count grows).

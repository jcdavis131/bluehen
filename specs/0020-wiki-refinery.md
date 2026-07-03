# Spec 0020 — Wiki Refinery: auto-built, auto-refined structured knowledge

**Status:** Active (Operator directive 2026-07-03: "build the wiki refinery end to end")
**Extends:** Spec 0018 (Data Refinery) · OKF v0.1 · Owner: Claude

## 1. What it is

The Refinery already generates one OKF card per dataset (single-shot).
The Wiki Refinery turns the catalog into a **living structured wiki**:

- **Deterministic layer (DR-108, no LLM):** rebuilt after every harvest/
  sync — an index page (measured overview), one topic page per tag,
  per-dataset pages with computed related-dataset cross-links (shared
  source, tag overlap), and a link-map page (the cross-link graph).
- **Refinement layer (DR-109, GLM-gated):** when `GLM_API_KEY` is set,
  changed pages receive an abstractive summary/refinement section
  appended under a dated heading (OKF living-document convention),
  marked `generated_by: glm`. Without the key, pages carry an honest
  "deterministic build only" footer — never a fake summary.

## 2. Storage & API

- Migration 010: `wiki_pages(id, slug uniq, kind index|topic|dataset|
  link-map, title, body_md, generated_by, sources jsonb, updated_at)`.
  Postgres is the durable store (prod knowledge/ is baked & ephemeral).
- Public (cached, rate-limited): `GET /v1/wiki` (list), `GET /v1/wiki/{slug}`.
- Admin: `POST /v1/admin/wiki/rebuild` (idempotent full rebuild).
- Triggers: worker boot sync → rebuild; harvest completion → rebuild;
  admin endpoint.

## 3. Surface

Refinery site `/wiki` (list, grouped by kind) + `/wiki/[slug]` (rendered
markdown — the Markdown primitive is PROMOTED from apps/hq to ui-fleet
per the design contract). Nav + sitemap follow SITE_NAV.

## 4. Honesty rules

Every number on wiki pages is computed from catalog rows at build time
and the build timestamp is printed; GLM sections are labeled as
model-generated with their date; absence of refinement is stated, not
hidden. No page exists without a generating rule or a labeled model pass.

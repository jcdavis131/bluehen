# Spec 0018 — Data Refinery: the harvesting & dataset-prep venture

**Status:** Draft — awaiting Operator sign-off
**Owner:** Claude (backend/data plane) · Cursor (site) · OpenCode (fixtures/tests)
**Depends on:** datalab package (shipped), OKF v0.1 (shipped), Spec 0015 (venture fleet), migration chain ≤ 008
**Operator gates:** G1 domain (`data.bhenre.com` suggested) · G2 S3/`MODEL_REGISTRY_URI`-style artifact creds (scale phase) · G3 consent/licensing copy legal review · G4 pricing for premium harvests

## 1. Why (venture thesis)

Every venture in the fleet consumes datasets; none *sells the refinery*.
Data Refinery is the public face of the Data Operations division: browse
provenance-carrying OKF datasets, contribute consented data, request
custom harvests, and watch the continuous builder run. It monetizes as
(a) custom harvest/prep engagements (leads), (b) premium dataset access
(later, via storefront commerce), and it feeds the training flywheel —
every consented contribution lands as gate-ready training data.

**Honesty constraints (normative):** no fake counts; every number on the
site is measured from the catalog; absent data renders the empty state +
its unblock command; consent is explicit, revocable-by-erasure, and
logged with provenance. No scraping targets that prohibit it; robots.txt
respected by the fetcher (already in datalab SSRF/fetch guard — verify).

## 2. What exists (build on, don't rebuild)

- `packages/datalab`: source registry (`config/datalab_sources.json`),
  watch loop (content-hash dedupe, interval scheduling), adapter ladders
  (Crawl4AI→httpx, Marker→pypdf, Chonkie→fallback chunker), SSRF guard,
  OKF dataset cards → `knowledge/datasets/`, JSONL store under
  `DATALAB_DIR`, inbox (`data/datalab/inbox/` — dumbmodel consented
  submissions already flow).
- agentkit `data-harvesting` team (playbook: coverage → ≤2 sources/run →
  verify → report) + `add_watch_source` deny-list guards.
- core-api tenant auth/RLS, jobs table pattern, `/v1/leads`, in-proc
  worker thread, `/data` volume, DB-artifact pattern (mig 008).

## 3. Product (the site)

New app `apps/sites/refinery`, fleet id **`refinery`**, division `data`.
Wears FleetShell + org chrome; accent: new token `--bh-copper` family
(distinct from all seven; AA-verify). Mobile-first per the shared system.

IA (SITE_NAV):
- `/` — the refinery story: live measured counts (datasets, docs, chunks,
  sources, last-tick time), the pipeline diagram (source → fetch →
  structure → chunk → card), latest cards strip, CTA trio (browse /
  contribute / request).
- `/catalog` — paginated, searchable dataset cards (filter by tag,
  source type, freshness). Server-rendered from the public catalog API;
  cursor pagination, cache headers.
- `/datasets/[id]` — full OKF card render, provenance chain, sample
  chunks (first N, sanitized), lineage (which sources/ticks), download
  sample (JSONL, rate-limited), "request full access" → lead.
- `/contribute` — consented submission: paste/upload text batch →
  live preview of chunking → explicit consent checkbox (G3 copy) →
  `/v1/datalab/submit`. Shows exactly what will be stored.
- `/requests` — custom harvest/prep offer: scope form → `/v1/leads`
  (source: refinery). Enterprise voice, measured proof points.
- `/ops` — division console (workspace-key gated, `noindex`): source
  registry table w/ health (last tick, consecutive failures), tick-now
  action, inbox review queue (approve → catalog), failure log.

## 4. Data plane (core-api) — API contract

Public (no auth, rate-limited, cached):
- `GET /v1/catalog/datasets?cursor&limit≤50&tag&q` → `{items:[{id,name,
  docCount,chunkCount,tokenEstimate,tags,createdAt,cardSlug}],nextCursor}`
- `GET /v1/catalog/datasets/{id}` → full card metadata + sample refs
- `GET /v1/catalog/datasets/{id}/sample` → first ≤20 chunks (sanitized)
- `GET /v1/catalog/stats` → `{datasets,docs,chunks,sources,lastTickAt}`

Tenant (workspace key):
- `POST /v1/datalab/submit` `{texts[]≤64|file, consent:true, tags[]}` →
  inbox row + provenance receipt id. **Consent required; 400 without.**
- `POST /v1/datalab/harvest` `{sourceId|url, priority}` → harvest job
  (admin/ops key) — enqueue, worker-thread executes a tick for it.
- `GET /v1/datalab/sources` / `POST .../sources` (ops; add_watch_source
  guards apply server-side too).

Schema (migration 009):
- `datasets(id uuid pk, slug uniq, name, doc_count int, chunk_count int,
  token_estimate bigint, tags jsonb, card_md text, provenance jsonb,
  source_id text, workspace_id nullable — null = public catalog,
  created_at, updated_at)` + btree on (created_at id) for cursor paging,
  GIN on tags.
- `harvest_jobs(id, source_id, status, error, requested_by, timestamps)`
  — mirror of training_jobs pattern incl. stale-requeue.
- `submissions(id, workspace_id, consent bool NOT NULL, receipt uuid,
  text_ref, status pending|approved|rejected, created_at)`.
Sync: watch tick already writes JSONL + OKF card → add a post-tick hook
that upserts the `datasets` row (card_md inline; artifacts stay on
volume/S3). Backfill script for existing cards.

## 5. Scale posture (millions of users/datasets — the honest path)

Ship v1 correct; scale by swap, not rewrite:
1. **Reads**: catalog endpoints are stateless + cursor-paginated +
  `Cache-Control: public, s-maxage=60` → CDN (Vercel edge for the BFF)
  absorbs read fan-out; Postgres indexes above; no COUNT(*) on hot paths
  (stats maintained by increment or periodic job).
2. **Writes**: submissions/harvests are queue-backed (jobs tables), the
  same claim/requeue/crash-recovery machinery the trainer proved tonight.
  Rate limits per key + per IP on public routes (REV-903 pattern).
3. **Artifacts**: JSONL on the volume now; `DATALAB_ARTIFACT_URI=s3://`
  flips storage adapter (mirror of artifacts.py boto3 pattern) — G2.
4. **Compute**: watch loop stays in-proc (GIL-yielding, proven);
  Modal/worker-service split when corpus volume demands (Spec 0011 path).
5. **Measured, not claimed**: load-test with k6 before any scale claim;
  record req/s + p95 in EVIDENCE.md with the test script committed.

## 6. Dynamic workflow (phases, owners, gates)

| Phase | What | Owner | Gate |
|---|---|---|---|
| 0 | This spec signed | Operator | sign-off |
| 1 | Migration 009 + catalog/stats APIs + tick→Postgres sync + backfill; tests | claude | CI green |
| 2 | Submit/harvest APIs + rate limits + inbox review endpoints; tests | claude | CI green |
| 3 | Site app `refinery` (all IA above) vs API contract; mock server from this spec until Phase 1 lands; org chrome + copper accent + mobile-first | cursor | build green + AA |
| 4 | Fleet wiring: fleet.json entry, SITE_CIRCUIT/NAV, sitemap/robots, workspace bootstrap, Vercel project + env, domain (G1) | claude | live smoke |
| 5 | Flywheel: dumbmodel inbox → review queue → catalog; research RSS auto-cards visible; BD scorecards tagged | claude | cards visible on /catalog |
| 6 | Scale hardening: k6 load test, cache verification, honest EVIDENCE row | claude+opencode | measured numbers |
| 7 | Launch review: 5-SME wiki pass (UX/Sec/Ecomm/Arch/Usability, OKF living reviews) + deploy checklist | sub-agents | STATUS board |

Parallelism: Phase 3 starts immediately against the contract; Phases 1–2
are pure backend; integration at Phase 4. Queue ids: DR-101..DR-107.

## 7. Non-goals (v1)

Paid dataset checkout (goes through storefront/Medusa later); user
accounts (workspace keys only); vector search over the catalog (the
research tenant serves that pattern); any dataset that lacks provenance.

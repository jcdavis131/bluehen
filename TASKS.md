# Tasks

> Blue Hen RE · **Source of truth:** [`config/work_queue.json`](./config/work_queue.json) · Updated: 2026-07-05

**Any agent:** `uv run python scripts/pick_task.py list` → `claim` → work → `done`

## Why blocked?

### BLK-DOCKER: Docker Desktop API error (consequence of BLK-DISK)
- **Why:** Postgres :5433, Redis :6379 unavailable — local API/worker/kickoff/migrate blocked.
- **Unblock:** Fix BLK-DISK first, then: pnpm dev:stack && pnpm db:migrate

### BLK-PROD: Prod stack not provisioned (Operator)
- **Why:** No Neon DATABASE_URL, Railway core-api/worker, or Vercel fleet env. Sites still on localhost API.
- **Unblock:** Operator: Neon via Vercel Marketplace, Railway deploy (ADR-002), pnpm vercel:link-fleet:exec

## Ready now (pick any)

- [ ] **AR-302** — Synthetic D_SERVE=32 edge stress (research) · spec [0003](./specs/0003-*.md)
- [ ] **AR-303** — AUG=0.5 lower view noise (research) · spec [0003](./specs/0003-*.md)
- [ ] **AR-304** — Batch=48 intermediate (research) · spec [0003](./specs/0003-*.md)
- [ ] **AR-305** — Weight decay 5e-5 (research) · spec [0003](./specs/0003-*.md)
- [ ] **RT-406** — Tenant Barlow recipe — all Phase A sites (research) · spec [0008](./specs/0008-*.md)
  - `Extend tenant_baseline.py --recipe barlow; run --all-sites`
- [ ] **KIT-001** — Kits registry: config/kits.json schema + @synthaembed/fleet loader (Spec 0022) (comms) · spec [0022](./specs/0022-*.md)
  - `Add KitsConfig types + loadKits() in packages/fleet; JSON schema validation script; export kit ids, plainName, sampleQueries from barrel.`
- [ ] **UX-104** — arxiviq homepage: plain search box hero; tier-compare demoted to deep-dive section (None)
- [ ] **UX-108** — Evidence citations unlinked (bhenre /try,/research) + arxiviq /methods needs plain-English takeaway box (None)
- [ ] **UX-109** — Legal pages say 'Template pending counsel review' (None)
- [ ] **UX-112** — Small copy/nav set: slasso /queue label ('Operating Loop'), credits upsell on slasso, signals platform-card subcopy, arxiviq /feedback customer language (None)
- [ ] **FLY-002** — Cross-site asset strip: every BU homepage shows the org's LIVE asset counters (models trained, datasets, scorecards, reports) (None)
- [ ] **EXH-003** — Consumer nodes emit exhaust: wire dumbmodel check + arxiviq queries + refinery contribute through /v1/exhaust schema (None)
- [ ] **SCALE-001** — HNSW indexes + encoder-cache sizing for tenant growth (None)
- [ ] **PMF-002** — Run 10 discovery interviews with the primary ICP (None)
- [ ] **BD-004** — 20-prospect list + outreach sequence for the primary ICP (None)
- [ ] **BD-005** — dumbmodel result page: consented email capture so free checks become a nurture list (None)
- [ ] **BD-006** — Weekly BD digest: funnel counts + leads + usage rolled into the hq org report (None)
- [ ] **TOWER-001** — Visual tower V1: DINOv2-S + projection head offline proof w/ eval vs CLIP + text baselines (None)
- [ ] **TOWER-004** — DINOv3 upgrade gate: accept Meta license on HF + provide HF_TOKEN (None)
- [ ] **UXR-003** — Launchpad wizard at bhenre.com/launchpad (sonnet-delegated, mobile-first) (None)

## In progress

_None claimed — run `pick_task.py claim <id>`_

## Blocked on infra (work elsewhere)

- [ ] **INF-001** — Local stack up (Postgres + Redis + migrate + bootstrap) · blockedBy: ['BLK-DISK', 'BLK-DOCKER']
- [ ] **INF-002** — Run API + worker + verify research-rag search · blockedBy: ['BLK-DOCKER']
- [ ] **RAG-501** — Scale arXiv corpus to 200 papers + re-kickoff · blockedBy: ['BLK-DOCKER']
- [ ] **RAG-504** — arxiviq tier drop@8 benchmark (20 queries) · blockedBy: ['BLK-DOCKER']
- [ ] **SRV-601** — MRL-trained checkpoint deploy on research-rag · blockedBy: ['BLK-DOCKER']
- [ ] **OMNI-004** — Wire /v1/omni/simulate integration test · blockedBy: ['BLK-DOCKER']
- [ ] **MON-002** — Storefront: API key management page (generate, view usage, set spend cap) (Spec 0021 P1) · blockedBy: ['MON-001']
- [ ] **MON-003** — Hosted inference tier: Modal serverless GPU endpoint for domain models; Medusa recurring product (Spec 0021 P2) · blockedBy: ['MON-001']
- [ ] **MON-004** — Storefront: hosted-model product page (per-domain model cards -> subscribe -> API key) (Spec 0021 P2) · blockedBy: ['MON-003']
- [ ] **MON-010** — hq revenue dashboard: per-stream MRR, passive vs active split, BU attribution (Spec 0021) · blockedBy: ['MON-001', 'MON-006']
- [ ] **KIT-002** — Storefront /kits landing — three persona cards + Just try it (Spec 0022 Phase A) · blockedBy: ['KIT-001']
- [ ] **KIT-004** — Per-kit sample search pages — chips + LiveSearchPanel on static corpus (Spec 0022 Phase B) · blockedBy: ['KIT-002', 'KIT-003']

## Recently done

- [x] ~~**PMF-003** — Instrument the funnel with our own exhaust API (dogfood): conversion events across all BU sites~~
- [x] ~~**PMF-004** — Design-partner program: page + offer on bhenre.com~~
- [x] ~~**PMF-005** — Competitive teardown + positioning wedge doc~~
- [x] ~~**BD-003** — Outbound asset kit: one measured-proof one-pager per business unit~~
- [x] ~~**UXR-001** — Sandbox tenant + nightly purge for the Launchpad~~
- [x] ~~**UXR-002** — ui-fleet: ModelReportCard + FilterChips components (sonnet-delegated)~~
- [x] ~~**UXR-004** — arxiviq research-lab adopts ModelReportCard~~
- [x] ~~**UXR-005** — Hero reframe (RECO-003) + Launchpad CTA~~

## Specs & context

| Doc | Role |
|---|---|
| [`specs/README.md`](./specs/README.md) | Spec status matrix |
| [`HANDOFF.md`](./HANDOFF.md) | Mission + repo map |
| [`program.md`](./program.md) | Autoresearch rules |
| [`docs/EXECUTIVE_ROADMAP.md`](./docs/EXECUTIVE_ROADMAP.md) | Stakeholder view |

_Regenerate: `uv run python scripts/pick_task.py render`_

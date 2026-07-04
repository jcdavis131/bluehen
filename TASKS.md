# Tasks

> Blue Hen RE · **Source of truth:** [`config/work_queue.json`](./config/work_queue.json) · Updated: 2026-07-04

**Any agent:** `uv run python scripts/pick_task.py list` → `claim` → work → `done`

## Why blocked?

### BLK-DOCKER: Docker Desktop API error (consequence of BLK-DISK)
- **Why:** Postgres :5433, Redis :6379 unavailable — local API/worker/kickoff/migrate blocked.
- **Unblock:** Fix BLK-DISK first, then: pnpm dev:stack && pnpm db:migrate

### BLK-PROD: Prod stack not provisioned (Operator)
- **Why:** No Neon DATABASE_URL, Railway core-api/worker, or Vercel fleet env. Sites still on localhost API.
- **Unblock:** Operator: Neon via Vercel Marketplace, Railway deploy (ADR-002), pnpm vercel:link-fleet:exec

## Ready now (pick any)

- [ ] **INF-000** — Free disk space + restart Docker Desktop (infra)
  - `docker system prune -a; remove apps/*/.next; restart Docker Desktop`
- [ ] **AR-301** — Barlow λ=0.022 near champion (research) · spec [0003](./specs/0003-*.md)
  - `daemon or: uv run python scripts/autoresearch_run.py cursor`
- [ ] **AR-302** — Synthetic D_SERVE=32 edge stress (research) · spec [0003](./specs/0003-*.md)
- [ ] **AR-303** — AUG=0.5 lower view noise (research) · spec [0003](./specs/0003-*.md)
- [ ] **AR-304** — Batch=48 intermediate (research) · spec [0003](./specs/0003-*.md)
- [ ] **AR-305** — Weight decay 5e-5 (research) · spec [0003](./specs/0003-*.md)
- [ ] **RT-404** — Tenant Barlow recipe — all Phase A sites (research) · spec [0008](./specs/0008-*.md)
  - `Extend tenant_baseline.py --recipe barlow; run --all-sites`
- [ ] **DATA-802** — Domain sweep Family C — Barlow arm (research) · spec [0003](./specs/0003-*.md)
  - `Add --loss barlow to domain_sweep.py; run sweep`
- [ ] **MON-007** — Signals premium notes: paywall gate on strategy report pages; Stripe subscription (Spec 0021 P5) (comms) · spec [0020](./specs/0020-*.md)
- [ ] **KIT-001** — Kits registry: config/kits.json schema + @synthaembed/fleet loader (Spec 0022) (comms) · spec [0022](./specs/0022-*.md)
  - `Add KitsConfig types + loadKits() in packages/fleet; JSON schema validation script; export kit ids, plainName, sampleQueries from barrel.`

## In progress

- [ ] **RT-402** — Real-text bake-off: AG News + both sites (@claude)
- [ ] **MON-001** — Stripe metered billing: core-api /v1/search + /v1/embed record usage events; webhook reconciles to invoice (Spec 0021 P1) (@claude)
- [ ] **MON-005** — Refinery dataset access tiers: free preview + paid full corpus; signed-URL delivery after checkout (Spec 0021 P3) (@claude)
- [ ] **MON-006** — slasso automated certification: self-service submission -> eval-harness run -> scorecard publish -> badge -> charge (Spec 0021 P4) (@claude)
- [ ] **MON-008** — CI step: publish trained ASN models to HuggingFace with model card (open-core, Spec 0021 P6) (@claude)

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

- [x] ~~**SITE-015** — BU team strips on all five business-unit homepages: division, offer, live proof metric (Spec 0019)~~
- [x] ~~**HQ-OPS-1** — hq: refinery division console (sources health, tick-now, submission review) — admin-keyed, internal~~
- [x] ~~**AR-310** — Re-measure champion under fixed-seed repeats (5x) — is baseline 1.465 reproducible?~~
- [x] ~~**DR-108** — Wiki Refinery deterministic layer (Spec 0020)~~
- [x] ~~**DR-109** — Wiki Refinery GLM refinement pass (Spec 0020)~~
- [x] ~~**KIT-003** — Kit sample corpora — content/kits/* JSONL seeded for all three personas (Spec 0022)~~
- [x] ~~**RT-403** — Promote barlow loss into prod DEFAULT_RECIPE behind tenant-corpus eval gates~~
- [x] ~~**INFRA-101** — Git-connect the three CLI-only Vercel projects (hub, finance-lab, training-console) so pushes auto-deploy~~

## Specs & context

| Doc | Role |
|---|---|
| [`specs/README.md`](./specs/README.md) | Spec status matrix |
| [`HANDOFF.md`](./HANDOFF.md) | Mission + repo map |
| [`program.md`](./program.md) | Autoresearch rules |
| [`docs/EXECUTIVE_ROADMAP.md`](./docs/EXECUTIVE_ROADMAP.md) | Stakeholder view |

_Regenerate: `uv run python scripts/pick_task.py render`_

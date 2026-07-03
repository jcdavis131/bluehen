# Tasks

> Blue Hen RE · **Source of truth:** [`config/work_queue.json`](./config/work_queue.json) · Updated: 2026-07-03

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
- [ ] **RT-401** — Real-text bake-off: research-rag corpus (research) · spec [0008](./specs/0008-*.md)
  - `pnpm evidence:realtext:research-rag`
- [ ] **RT-402** — Real-text bake-off: AG News + both sites (research) · spec [0008](./specs/0008-*.md)
  - `uv run python scripts/realtext_methods.py --site both`
- [ ] **RT-403** — Collapse-regime vs BGE/e5/Qwen3 panel (research) · spec [0008](./specs/0008-*.md)
  - `uv run python scripts/collapse_regime.py`
- [ ] **RAG-502** — Implement rag_chunk_ablation.py (research) · spec [0008](./specs/0008-*.md)
  - `Create scripts/rag_chunk_ablation.py — 256/512/1024 token chunks on research-rag holdout`
- [ ] **RAG-503** — Hard negative mining in hill-climb pair builder (research) · spec [0009](./specs/0009-*.md)
  - `Extend core-api lifecycle or worker pair generation with corpus-mined negatives`
- [ ] **BD-702** — Commercial panel scorecard on dumbmodel (bd) · spec [0008](./specs/0008-*.md)
- [ ] **DATA-802** — Domain sweep Family C — Barlow arm (research) · spec [0003](./specs/0003-*.md)
  - `Add --loss barlow to domain_sweep.py; run sweep`
- [ ] **MON-005** — Refinery dataset access tiers: free preview + paid full corpus; signed-URL delivery after checkout (Spec 0021 P3) (comms) · spec [0020](./specs/0020-*.md)
- [ ] **MON-007** — Signals premium notes: paywall gate on strategy report pages; Stripe subscription (Spec 0021 P5) (comms) · spec [0020](./specs/0020-*.md)
- [ ] **MON-008** — CI step: publish trained ASN models to HuggingFace with model card (open-core, Spec 0021 P6) (execution) · spec [0020](./specs/0020-*.md)

## In progress

- [ ] **MON-001** — Stripe metered billing: core-api /v1/search + /v1/embed record usage events; webhook reconciles to invoice (Spec 0021 P1) (@claude)
- [ ] **MON-006** — slasso automated certification: self-service submission -> eval-harness run -> scorecard publish -> badge -> charge (Spec 0021 P4) (@claude)

## Blocked on infra (work elsewhere)

- [ ] **INF-001** — Local stack up (Postgres + Redis + migrate + bootstrap) · blockedBy: ['BLK-DISK', 'BLK-DOCKER']
- [ ] **INF-002** — Run API + worker + verify research-rag search · blockedBy: ['BLK-DOCKER']
- [ ] **RT-404** — Tenant Barlow recipe — all Phase A sites · blockedBy: ['RT-401']
- [ ] **RAG-501** — Scale arXiv corpus to 200 papers + re-kickoff · blockedBy: ['BLK-DOCKER']
- [ ] **RAG-504** — arxiviq tier drop@8 benchmark (20 queries) · blockedBy: ['BLK-DOCKER']
- [ ] **SRV-601** — MRL-trained checkpoint deploy on research-rag · blockedBy: ['BLK-DOCKER']
- [ ] **OMNI-004** — Wire /v1/omni/simulate integration test · blockedBy: ['BLK-DOCKER']
- [ ] **MON-002** — Storefront: API key management page (generate, view usage, set spend cap) (Spec 0021 P1) · blockedBy: ['MON-001']
- [ ] **MON-003** — Hosted inference tier: Modal serverless GPU endpoint for domain models; Medusa recurring product (Spec 0021 P2) · blockedBy: ['MON-001']
- [ ] **MON-004** — Storefront: hosted-model product page (per-domain model cards -> subscribe -> API key) (Spec 0021 P2) · blockedBy: ['MON-003']
- [ ] **MON-010** — hq revenue dashboard: per-stream MRR, passive vs active split, BU attribution (Spec 0021) · blockedBy: ['MON-001', 'MON-006']

## Recently done

- [x] ~~**DR-106** — Refinery scale hardening: k6 load test + cache verify + honest EVIDENCE row~~
- [x] ~~**DR-107** — Refinery launch review: 5-SME OKF living reviews + deploy checklist~~
- [x] ~~**SITE-014** — Storefront restructure as THE company website: divisions overview grid from registry, operating-loop diagram, BU offer cards (Spec 0019)~~
- [x] ~~**SITE-015** — BU team strips on all five business-unit homepages: division, offer, live proof metric (Spec 0019)~~
- [x] ~~**HQ-OPS-1** — hq: refinery division console (sources health, tick-now, submission review) — admin-keyed, internal~~
- [x] ~~**AR-310** — Re-measure champion under fixed-seed repeats (5x) — is baseline 1.465 reproducible?~~
- [x] ~~**DR-108** — Wiki Refinery deterministic layer (Spec 0020)~~
- [x] ~~**DR-109** — Wiki Refinery GLM refinement pass (Spec 0020)~~

## Specs & context

| Doc | Role |
|---|---|
| [`specs/README.md`](./specs/README.md) | Spec status matrix |
| [`HANDOFF.md`](./HANDOFF.md) | Mission + repo map |
| [`program.md`](./program.md) | Autoresearch rules |
| [`docs/EXECUTIVE_ROADMAP.md`](./docs/EXECUTIVE_ROADMAP.md) | Stakeholder view |

_Regenerate: `uv run python scripts/pick_task.py render`_

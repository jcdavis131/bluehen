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
- [ ] **AR-306** — depth=2 GELU@256 encoder (code change) (research) · spec [0003](./specs/0003-*.md)
  - `.claude/autoresearch-delegate.md → uv run python scripts/autoresearch_run.py claude`
- [ ] **AR-307** — InfoNCE + Barlow aux 0.1 hybrid loss (research) · spec [0003](./specs/0003-*.md)
  - `.claude/autoresearch-delegate.md claude-2`
- [ ] **AR-308** — MRL prefix loss in autoresearch_train.py (research) · spec [0003](./specs/0003-*.md)
  - `.claude/autoresearch-delegate.md claude-3-mrl`
- [ ] **AR-309** — Rank floor when served_rank < 12 (research) · spec [0003](./specs/0003-*.md)
  - `.claude/autoresearch-delegate.md claude-4-rankfloor`
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
- [ ] **UX-140** — core-api: stage= filter on GET /v1/ledger (hall submissions scroll out of the 200-row window) (execution) · spec [0020](./specs/0020-*.md)
  - `services/core-api — add stage query param to get_ledger (or dedicated /v1/hall table)`

## In progress

_None claimed — run `pick_task.py claim <id>`_

## Blocked on infra (work elsewhere)

- [ ] **INF-001** — Local stack up (Postgres + Redis + migrate + bootstrap) · blockedBy: ['BLK-DISK', 'BLK-DOCKER']
- [ ] **INF-002** — Run API + worker + verify research-rag search · blockedBy: ['BLK-DOCKER']
- [ ] **RT-404** — Tenant Barlow recipe — all Phase A sites · blockedBy: ['RT-401']
- [ ] **RAG-501** — Scale arXiv corpus to 200 papers + re-kickoff · blockedBy: ['BLK-DOCKER']
- [ ] **RAG-504** — arxiviq tier drop@8 benchmark (20 queries) · blockedBy: ['BLK-DOCKER']
- [ ] **SRV-601** — MRL-trained checkpoint deploy on research-rag · blockedBy: ['BLK-DOCKER']
- [ ] **OMNI-004** — Wire /v1/omni/simulate integration test · blockedBy: ['BLK-DOCKER']

## Recently done

- [x] ~~**UX-120** — Wire ReturnGreeting/ExplorationTracker/MilestoneStrip/CountUpStat/CommandPalette into dumbmodel, validation, simulation, refinery~~
- [x] ~~**UX-121** — Hall of Cone accepts consented user-submitted scores (live leaderboard, not static fixture)~~
- [x] ~~**UX-122** — Permalinked /check/[id] results page instead of raw share-card PNG~~
- [x] ~~**UX-123** — TeamStrip (or byline) on interior pages, not just BU homepages~~
- [x] ~~**UX-124** — Add a real live proof metric to simulation homepage (spec 0019 §2.4 requires one; currently none)~~
- [x] ~~**UX-130** — Move raw CLI + unexplained ML hyperparameters off public pages, behind an 'for engineers' disclosure~~
- [x] ~~**UX-131** — hq: explicit diagnostic when API_SECRET_KEY unset, instead of silent empty state~~
- [x] ~~**UX-132** — hq homepage: one line stating it's the internal cockpit of a company with a public site~~

## Specs & context

| Doc | Role |
|---|---|
| [`specs/README.md`](./specs/README.md) | Spec status matrix |
| [`HANDOFF.md`](./HANDOFF.md) | Mission + repo map |
| [`program.md`](./program.md) | Autoresearch rules |
| [`docs/EXECUTIVE_ROADMAP.md`](./docs/EXECUTIVE_ROADMAP.md) | Stakeholder view |

_Regenerate: `uv run python scripts/pick_task.py render`_

# Tasks

> Blue Hen RE · **Source of truth:** [`config/work_queue.json`](./config/work_queue.json) · Updated: 2026-06-29

**Any agent:** `uv run python scripts/pick_task.py list` → `claim` → work → `done`

## Why blocked?

### BLK-DISK: C: drive nearly full (~0.2 GB free)
- **Why:** ENOSPC caused Docker Desktop engine failure, worker crashes, failed writes (.next, checkpoints, HF cache). Research loop skips realtext below 400MB.
- **Unblock:** Free 5+ GB: docker system prune -a, delete apps/*/.next, clear %TEMP%, empty Recycle Bin. Restart Docker Desktop.

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
- [ ] **RAG-502** — Implement rag_chunk_ablation.py (research) · spec [0008](./specs/0008-*.md)
  - `Create scripts/rag_chunk_ablation.py — 256/512/1024 token chunks on research-rag holdout`
- [ ] **RAG-503** — Hard negative mining in hill-climb pair builder (research) · spec [0009](./specs/0009-*.md)
  - `Extend core-api lifecycle or worker pair generation with corpus-mined negatives`
- [ ] **RAG-505** — arXiv exam runner in eval-public (bd) · spec [0008](./specs/0008-*.md)
  - `Port exam logic → packages/eval-public; wire arxiviq homepage`
- [ ] **SITE-001** — Hub /research experiment museum page (comms) · spec [0012](./specs/0012-*.md)
  - `build_experiment_index.py + apps/sites/hub/app/research/page.tsx`
- [ ] **SITE-002** — arxiviq /methods page (org recipe + evidence dates) (comms) · spec [0007](./specs/0007-*.md)
  - `apps/sites/research-rag/app/methods/page.tsx`
- [ ] **SITE-003** — dumbmodel /museum collapse failures (comms) · spec [0007](./specs/0007-*.md)
  - `apps/sites/dumbmodel/app/museum/page.tsx`
- [ ] **SPEC-006** — Eve subagents + trace wiring (agent) · spec [0006](./specs/0006-*.md)
  - `apps/synthorg — subagent descriptions + synth-core trace IDs`
- [ ] **DATA-802** — Domain sweep Family C — Barlow arm (research) · spec [0003](./specs/0003-*.md)
  - `Add --loss barlow to domain_sweep.py; run sweep`

## In progress

_None claimed — run `pick_task.py claim <id>`_

## Blocked on infra (work elsewhere)

- [ ] **INF-001** — Local stack up (Postgres + Redis + migrate + bootstrap) · blockedBy: ['BLK-DISK', 'BLK-DOCKER']
- [ ] **INF-002** — Run API + worker + verify research-rag search · blockedBy: ['BLK-DOCKER']
- [ ] **INF-003** — Deploy core-api + worker to Railway + Neon · blockedBy: ['BLK-PROD']
- [ ] **INF-004** — Vercel fleet link (5 projects) + per-site SYNTH_API_KEY · blockedBy: ['BLK-PROD']
- [ ] **INF-005** — Attach locked domains to monorepo builds · blockedBy: ['BLK-PROD']
- [ ] **RT-401** — Real-text bake-off: research-rag corpus · blockedBy: ['BLK-DISK']
- [ ] **RT-402** — Real-text bake-off: AG News + both sites · blockedBy: ['BLK-DISK']
- [ ] **RT-403** — Collapse-regime vs BGE/e5/Qwen3 panel · blockedBy: ['BLK-DISK']
- [ ] **RT-404** — Tenant Barlow recipe — all Phase A sites · blockedBy: ['RT-401']
- [ ] **RAG-501** — Scale arXiv corpus to 200 papers + re-kickoff · blockedBy: ['BLK-DOCKER']
- [ ] **RAG-504** — arxiviq tier drop@8 benchmark (20 queries) · blockedBy: ['BLK-DOCKER']
- [ ] **SRV-601** — MRL-trained checkpoint deploy on research-rag · blockedBy: ['BLK-DOCKER']

## Recently done

- [x] ~~**DONE-001** — research-rag local re-kickoff (asn-7901034, 39 chunks)~~
- [x] ~~**DONE-002** — arxiviq TierComparePanel + tier-aware /v1/search~~
- [x] ~~**DONE-003** — Literature radar + harvest + FRONTIER_ARCHITECTURE.md~~
- [x] ~~**DONE-004** — Spec alignment — unified BD queue path, 0012 Phase A vs A+ scope~~
- [x] ~~**DONE-005** — Phase A+ runtime handoffs — handoffs.py, charter gate, control promotion UI~~

## Specs & context

| Doc | Role |
|---|---|
| [`specs/README.md`](./specs/README.md) | Spec status matrix |
| [`HANDOFF.md`](./HANDOFF.md) | Mission + repo map |
| [`program.md`](./program.md) | Autoresearch rules |
| [`docs/EXECUTIVE_ROADMAP.md`](./docs/EXECUTIVE_ROADMAP.md) | Stakeholder view |

_Regenerate: `uv run python scripts/pick_task.py render`_

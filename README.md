# Blue Hen RE

**RE = RAG Embeddings.** Fleet-orchestrated platform: one agent, one API, many mini-org sites.

**Repository:** [github.com/jcdavis131/henington-homes](https://github.com/jcdavis131/henington-homes)  
**Primary domain:** [bhenre.com](https://bhenre.com) · **Control plane:** [jcamd.com](https://jcamd.com)  
**Fleet registry:** [`config/fleet.json`](./config/fleet.json) · **Agent guide:** [`AGENTS.md`](./AGENTS.md) · **Agent init:** [`docs/AGENT_INIT.md`](./docs/AGENT_INIT.md) · **Tasks:** [`TASKS.md`](./TASKS.md)

## Architecture (fleet-centered)

```
config/fleet.json          ← single source of truth: all sites, domains, paths
packages/fleet             ← fleet SDK (agent, CLI, control UI)
apps/control               ← jcamd.com operator control plane
apps/synthorg              ← Eve fleet agent (operates across all sites)
apps/sites/*               ← tenant fronts (hub, dumbmodel, slasso, arxiviq, finance-lab, …)
services/core-api          ← uniform API chokepoint
services/worker            ← ASN train → eval → deploy pipeline
packages/synth-core        ← only way in for agents, CLI, sites
packages/eval-harness      ← deploy gates (nDCG, effective rank)
packages/ui-fleet          ← shared FleetShell nav
```

## Site fleet & domains

| Domain | Site id | Path | Status |
|---|---|---|---|
| [jcamd.com](https://jcamd.com) | control | `apps/control` | active |
| [bhenre.com](https://bhenre.com) | hub | `apps/sites/hub` | active |
| [dumbmodel.com](https://dumbmodel.com) | dumbmodel | `apps/sites/dumbmodel` | active |
| [slasso.com](https://slasso.com) | benchmark-lab | `apps/sites/benchmark-lab` | active |
| [arxiviq.com](https://arxiviq.com) | research-rag | `apps/sites/research-rag` | active |
| *(TBD)* | finance-lab | `apps/sites/finance-lab` | stub — Phase B |

**Brand duo:** [bhenre.com](https://bhenre.com) (blue hen) · [dumbmodel.com](https://dumbmodel.com) (the cone)

Each tenant is a **mini-organization** sharing **AwakenedSleepNet (ASN)** and **core-api**, isolated by `workspace_id`.

## What's here

1. [`PLAN.md`](./PLAN.md) — architecture + spec-driven plan  
2. [`HANDOFF.md`](./HANDOFF.md) — session handoff + fleet table  
3. [`AGENTS.md`](./AGENTS.md) — pair-programming rules for Cursor / Eve  
4. [`EVIDENCE.md`](./EVIDENCE.md) — measured results ledger (refresh: `pnpm evidence:collect`)  
5. [`docs/SOURCE_MAP.md`](./docs/SOURCE_MAP.md) — Google Docs ↔ repo canonical files  
6. [`specs/`](./specs) — spec-driven development ([status matrix](./specs/README.md))  

## Layout

```
config/fleet.json
apps/
  control/              Fleet control plane → jcamd.com
  synthorg/               Eve fleet agent
  sites/
    hub/                  Blue Hen RE hub → bhenre.com
    dumbmodel/            Public proof → dumbmodel.com
    benchmark-lab/        RAG benchmarks → slasso.com
    research-rag/         arXiv RAG → arxiviq.com
    finance-lab/          Phase B stub (simulation only)
services/
  core-api/               FastAPI chokepoint
  worker/                 Postgres job consumer (production training path)
  trainer/                Modal GPU stub
infra/
  railway.md              Production deploy runbook (ADR-002)
  docker-entrypoint.sh    api | worker | migrate
packages/
  fleet/                  Fleet registry SDK
  ui-fleet/               Cross-site nav shell
  synth-core/             Uniform access + tracing
  cli/                    synth CLI
  asn-engine/             ASN math + training
  eval-harness/           Deploy gates
  eval-public/            dumbmodel baseline panel
```

## Quick start

```bash
pnpm install && uv sync --all-packages --extra dev --extra model

# 1. Postgres + Redis (required for production path)
pnpm dev:stack                    # docker compose up
pnpm db:migrate                   # Alembic + RLS policies

# 2. Core API + training worker
pnpm dev:api                      # :8000
pnpm dev:worker                   # processes ASN jobs

# 3. Provision mini-org workspaces + kick off training
pnpm bootstrap:orgs               # writes data/workspaces/*.env with API keys
pnpm kickoff:orgs                 # hill-climb: ingest → train → eval → deploy

# 4. Fleet sites (NEXT_PUBLIC_FLEET_LOCAL=1)
pnpm dev:fleet
.\scripts\fleet-review.ps1 -Open   # Windows: review all UIs

# Eve fleet agent
pnpm --filter @synthaembed/synthorg dev

# Review before deploy
pnpm review
uv run pytest packages/asn-engine/tests services/core-api/tests -q
```

Each Phase A mini-org (`benchmark-lab`, `research-rag`, `dumbmodel`, `hub`) gets an isolated
workspace, org-specific corpus under `data/corpora/{siteId}/`, and its own ASN training job
processed by the worker. Models land in `data/artifacts/{workspaceId}/`.

Evidence refresh: `pnpm evidence:collect` · `uv run python scripts/engine_proof.py`

See `PLAN.md` for the full loop.

## Production deploy

Sites stay on **Vercel**; backend runs on **Railway** + **Neon** (ADR-002):

```bash
pnpm prod:deploy                 # orchestrated checklist
pnpm prod:deploy:exec            # --step all --execute
# or stepwise:
pnpm deploy:railway              # generates data/deploy/railway.env
pnpm deploy:railway:migrate      # after Neon DATABASE_URL is set
pnpm deploy:railway:exec         # Railway core-api deploy
pnpm bootstrap:orgs
pnpm vercel:link-fleet:exec
pnpm vercel:env-fleet:exec
```

Details: [`infra/railway.md`](./infra/railway.md) · ADR-003 CLI: [`docs/adr/003-unified-org-cli.md`](./docs/adr/003-unified-org-cli.md).

## Status (2026-06-30)

| Area | State |
|---|---|
| Phase A orgs | Trained, deployed, pgvector-indexed (hub, benchmark-lab, research-rag, dumbmodel) |
| core-api | v0.3 Postgres + RLS + pgvector search + fleet admin |
| Sites | 6 Next.js apps + control; `pnpm review` passes (includes finance-lab stub) |
| CI | Site build, ASN math (17 tests), core-api (21 tests: RLS, workspaces, handoffs, serving tiers) |
| Prod hosting | ADR-002 accepted — Railway + Neon runbook + deploy scripts; live cutover pending (`INF-003`) |
| Evidence | `pnpm evidence:collect` · `engine_proof.py` fixed collapse trigger → no-harm parity; benefit claim still **Hypothesis** (`EVIDENCE.md` §3.1) |
| Open | Wire heterosynaptic EMA, collapse-regime ablations, Eve subagents, Modal GPU, Phase B |

Run `pnpm review` before deploy. Specs: [`specs/README.md`](./specs/README.md). Handoff: [`HANDOFF.md`](./HANDOFF.md).

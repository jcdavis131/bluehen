# Blue Hen RE

Blue Hen RE (RE = *Relay Engine* / *RAG Embeddings*) is a closed-loop ML
organization run as one monorepo: consumer-facing sites provide passive value and emit
consented data exhaust; a FastAPI/Postgres backbone routes it; an
evaluation-gated training pipeline turns it into stronger embedding
models that deploy back to the same surfaces. Assets the loop produces —
models, datasets, scorecards, reports, knowledge — are the product line.

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

| Surface | What it is |
|---|---|
| [bhenre.com](https://bhenre.com) | The company: org story, store, metered API |
| [dumbmodel.com](https://dumbmodel.com) | Free embedding health checks (the funnel) |
| [slasso.com](https://slasso.com) | Automated RAG certification |
| [arxiviq.com](https://arxiviq.com) | Live retrieval assistant + research registry |
| [data.bhenre.com](https://data.bhenre.com) | Dataset catalog + self-writing wiki |
| [signals.bhenre.com](https://signals.bhenre.com) | Simulation-only strategy reports |
| [jcamd.com](https://jcamd.com) | The operator cockpit (runs in the open) |

**Docs:** [Site architecture](./docs/SITE_ARCHITECTURE.md) ·
[Orchestration](./docs/ORCHESTRATION.md) · [Specs](./specs/) ·
[Evidence ledger](./EVIDENCE.md) · [Status board](./docs/STATUS.md) ·
[Tasks](./TASKS.md)
**Agent onboarding:** [`AGENTS.md`](./AGENTS.md) · [`docs/AGENT_INIT.md`](./docs/AGENT_INIT.md)

## Architecture (fleet-centered)

```
config/fleet.json          ← single source of truth: all sites, domains, paths
packages/fleet             ← fleet SDK (agent, CLI, control UI)
apps/hq               ← jcamd.com operator control plane
apps/synthorg              ← Eve fleet agent (operates across all sites)
apps/sites/*               ← tenant fronts (storefront, dumbmodel, validation, research, simulation, observatory, refinery)
services/core-api          ← uniform API chokepoint
services/worker            ← ASN train → eval → deploy pipeline
services/commerce          ← Medusa v2 store backend (open source; own lockfile)
packages/synth-core        ← only way in for agents, CLI, sites
packages/eval-harness      ← deploy gates (nDCG, effective rank)
packages/ui-fleet          ← shared FleetShell nav
packages/runboard          ← experiment tracking (W&B-style; runs → data/runs)
packages/datalab           ← data collection pipeline (→ data/datalab + OKF dataset cards)
knowledge/                 ← OKF knowledge bundle: platform concepts, dataset cards, SME reviews
```

**Training telemetry quick start:** `uv run python -m runboard demo` →
`uv run python -m runboard serve` → `pnpm --filter @synthaembed/observatory dev`
(Observatory on :3006). Details: [`knowledge/platform/training-console.md`](./knowledge/platform/training-console.md).

**Continuous dataset builder:** `uv run python -m datalab watch --once` collects due
sources from [`config/datalab_sources.json`](./config/datalab_sources.json), dedupes by
content hash, and grows the OKF dataset library in [`knowledge/datasets/`](./knowledge/datasets/).

**Commerce:** the hub sells through an open-source Medusa backend
([`services/commerce`](./services/commerce/README.md), Store API :9000) with Stripe
hosted payment; provider-agnostic client in `apps/sites/storefront/lib/commerce.ts`
(`COMMERCE_PROVIDER=medusa|shopify`). Buyer path: `/pricing` → `/contact` → `/store`.

## Site fleet & domains

| Domain | Site id | Path | Status |
|---|---|---|---|
| [jcamd.com](https://jcamd.com) | hq | `apps/hq` | active |
| [bhenre.com](https://bhenre.com) | storefront | `apps/sites/storefront` | active |
| [dumbmodel.com](https://dumbmodel.com) | dumbmodel | `apps/sites/dumbmodel` | active |
| [slasso.com](https://slasso.com) | validation | `apps/sites/validation` | active |
| [arxiviq.com](https://arxiviq.com) | research | `apps/sites/research` | active |
| [signals.bhenre.com](https://signals.bhenre.com) | simulation | `apps/sites/simulation` | active — Simulation Lab (simulation only) |
| [training.jcamd.com](https://training.jcamd.com) | observatory | `apps/sites/observatory` | active — Observatory (internal) |
| [data.bhenre.com](https://data.bhenre.com) | refinery | `apps/sites/refinery` | planned — Data Refinery (Spec 0018) |

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
  hq/                    Fleet control plane → jcamd.com
  synthorg/              Eve fleet agent
  sites/
    storefront/          Blue Hen RE hub → bhenre.com
    dumbmodel/           Public proof → dumbmodel.com
    validation/          RAG benchmarks → slasso.com
    research/            arXiv RAG → arxiviq.com
    simulation/          Simulation Lab → signals.bhenre.com (simulation only)
    observatory/         Internal training view → training.jcamd.com
    refinery/            Data Refinery → data.bhenre.com (planned, Spec 0018)
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

Each Phase A mini-org (`validation`, `research`, `dumbmodel`, `storefront`) gets an isolated
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
| Phase A orgs | Trained, deployed, pgvector-indexed (storefront, validation, research, dumbmodel) |
| core-api | v0.3 Postgres + RLS + pgvector search + fleet admin |
| Sites | 7 Next.js apps + hq control; `pnpm review` passes (includes simulation stub) |
| CI | Site build, ASN math (17 tests), core-api (21 tests: RLS, workspaces, handoffs, serving tiers) |
| Prod hosting | ADR-002 accepted — Railway + Neon runbook + deploy scripts; live cutover pending (`INF-003`) |
| Evidence | `pnpm evidence:collect` · `engine_proof.py` fixed collapse trigger → no-harm parity; benefit claim still **Hypothesis** (`EVIDENCE.md` §3.1) |
| Open | Wire heterosynaptic EMA, collapse-regime ablations, Eve subagents, Modal GPU, Phase B |

Run `pnpm review` before deploy. Specs: [`specs/README.md`](./specs/README.md). Handoff: [`HANDOFF.md`](./HANDOFF.md).

# SynthaEmbed OS (codename: bluehenre)

**Repository:** [github.com/jcdavis131/henington-homes](https://github.com/jcdavis131/henington-homes)  
*(Repurposed from the prior Henington Homes codebase; Vercel project may still be linked at `bhre.vercel.app` — re-point the project root to `apps/org-template` after deploy.)*

A multi-tenant platform for **autonomous, collapse-resistant embedding organizations**.

Each tenant is a **mini-organization**: its own site (Next.js on Vercel), its own scoped
API (FastAPI), and its own continuous **auto-research loop** that trains, evaluates, and
serves a domain-specialized SOTA embedding model. All mini-orgs share one engine:
**AwakenedSleepNet (ASN)** — a sleep/synaptic-homeostasis–inspired contrastive trainer
built around effective-rank monitoring, three-tiered spectral surgery, Newton-Schulz
orthogonalization, and an information-bottleneck projection head.

## What's here

This repository is a **spec-driven** monorepo. Read these first, in order:

1. [`PLAN.md`](./PLAN.md) — the full architecture + spec-driven development plan.
2. [`SCIENCE_REVIEW.md`](./SCIENCE_REVIEW.md) — research-integrity audit of the source whitepaper (what's real, what to verify, what to drop).
3. [`specs/`](./specs) — one spec per capability. Code follows specs, not the other way around.

## Layout

```
apps/
  web/              Next.js control plane + tenant dashboards (Vercel)
  org-template/     Template for a "mini-org" front-end (clone or multi-tenant route)
services/
  core-api/         FastAPI: auth, tenants, ledger, serving gateway, job orchestration
  conductor/        Auto-research loop worker (LLM-orchestrated hill climbing)
  trainer/          PyTorch training workers (ASN engine entrypoints, GPU)
packages/
  asn-engine/       ASN model, spectral surgery, Newton-Schulz, losses  (Python)
  eval-harness/     MTEB-style + intrinsic spectral diagnostics          (Python)
  sdk-ts/           TypeScript client SDK for core-api
  ui/               Shared React component library (shadcn-based)
  config/           Shared TS configs (eslint, tsconfig, tailwind)
specs/              Spec-driven development documents
infra/              Docker, compose, CI helpers
docs/               Long-form docs
```

## Quick start (local dev)

```bash
# 1. JS workspaces
pnpm install

# 2. Python workspaces (uv recommended)
uv sync

# 3. Local infra (postgres + pgvector, redis)
docker compose -f infra/docker-compose.yml up -d

# 4. API + web
uv run uvicorn app.main:app --reload --app-dir services/core-api   # http://localhost:8000
pnpm --filter web dev                                              # http://localhost:3000
```

See `PLAN.md` §"Local development" for the full loop.

## Status

Greenfield scaffold. Implementation happens spec-by-spec — see the roadmap in `PLAN.md`.

# Specs

Spec-driven development. Code follows specs; specs follow `PLAN.md` and `SCIENCE_REVIEW.md`.

- Specs are numbered `NNNN-short-name.md` and written from `0000-template.md`.
- Status: **Draft → Ready → Implemented → Superseded**. Ship only from **Ready** or **Implemented**.
- Shipped specs are immutable. Changes get a new spec or a tracked revision note.
- ML specs MUST include an **evaluation gate** CI can enforce.

## Status matrix (2026-06-30)

| # | Title | Status | Implementation |
|---|---|---|---|
| [0001](./0001-platform-overview.md) | Platform overview & boundaries | **Implemented** | Glossary + guardrails in HANDOFF, AGENTS |
| [0002](./0002-mini-organization-model.md) | Tenancy & isolation | **Implemented** | Alembic `001`–`004`, RLS tests, bootstrap |
| [0003](./0003-asn-embedding-engine.md) | ASN embedding engine | **Implemented** | `packages/asn-engine`, train_loop, tests |
| [0004](./0004-core-api.md) | Core API v0.3 | **Implemented** | `services/core-api`, worker, pgvector |
| [0005](./0005-auto-research-conductor.md) | Auto-research loop | **Partial** | v0.3 hill-climb ✅; LLM recipes + 0012 handoffs TBD |
| [0006](./0006-unified-cli-and-tracing.md) | CLI, synth-core, tracing | **Partial** | synth-core + CLI; bypass lint + Eve trace TBD |
| [0007](./0007-fleet-registry-and-sites.md) | Fleet registry & sites | **Implemented** | `config/fleet.json`, 7 sites (+ finance stub), control UI |
| [0008](./0008-eval-harness-and-gates.md) | Eval harness & deploy gates | **Implemented** | `packages/eval-harness`, worker eval stage |
| [0009](./0009-training-worker-lifecycle.md) | Training worker & lifecycle | **Implemented** | `services/worker`, Phase A orgs trained |
| [0010](./0010-finance-applied-test.md) | Finance applied-test (Phase B) | **Draft** | `apps/sites/simulation` stub; from Google Doc 3 |
| [0011](./0011-modal-trainer-production.md) | Modal GPU trainer (production) | **Draft** | `services/trainer` stub |
| [0012](./0012-synthetic-org-divisions-and-handoffs.md) | Org divisions & closed loop | **Implemented** | registry + Phase A+ handoffs (`handoffs.py`, charters, control UI) |
| [0013](./0013-omni-market-alpha-engine.md) | Omni-market alpha engine (Phase B) | **Ready** | `packages/omni-sim`, `/v1/omni/*`, simulation, `scripts/omni_*` |
| [0014](./0014-agentic-org-teams.md) | Agentic org teams (GLM) + commerce boot | **Implemented** | `packages/agentkit`, `config/agent_teams.json`, `services/commerce` boot |
| [0015](./0015-venture-fleet.md) | Venture fleet — one business per public site | **Ready** | Approved; dumbmodel venture v1 in progress (SITE-008) |
| [0016](./0016-dumbmodel-game-layer.md) | dumbmodel game layer — play → labeled training data | **Draft** | Awaiting Operator sign-off (game set + consent copy); phase 3 gated on REV-903 |
| [0017](./0017-fleet-tastemaker-redesign.md) | Fleet tastemaker redesign — Kubrick × Wes Anderson × modernized TUI | **Ready** | `packages/ui-fleet` tokens + primitives; 7-site spine rollout |
| [0018](./0018-data-refinery.md) | Data Refinery — harvesting & dataset-prep venture | **Active** | `packages/datalab`, `apps/sites/refinery` (data.bhenre.com), DR-101..107, migration 009 |
| [0019](./0019-corporate-topology.md) | Corporate topology — one company site, revenue-bearing business units | **Active** | Refines 0015/0012/0018; company-site restructure + BU team strips |
| [0020](./0020-monetization-layer.md) | Monetization layer — diversified passive + active income, low overhead | **Draft** | 6 passive + 5 active streams; metered API, hosted inference, dataset marketplace, automated certification, premium notes, open-core |

**Production hosting:** Vercel (sites) + Railway (core-api + worker) + Neon Postgres — [ADR-002](../docs/adr/002-core-api-hosting.md), [ADR-003](../docs/adr/003-unified-org-cli.md) (CLI), [`infra/railway.md`](../infra/railway.md). Deploy task: `INF-003` (Operator).

**Wiki (agent knowledge):** [`docs/wiki/`](../docs/wiki/) — SESSION_BOOT, BUILD, TECH_DEBT, ARCHITECTURE_REVIEW, LOCAL_DEV.

## Deploy traceability

```
ADR-002 (Railway) + Dockerfile + railway.toml + railway.worker.toml
    ↓
infra/railway.md + scripts/railway-deploy.mjs + scripts/prod-deploy.mjs
    ↓
pnpm prod:deploy | deploy:railway* → bootstrap:orgs → vercel:env-fleet:exec
    ↓
specs/0004 (core-api rollout, /readyz) · specs/0009 (worker rollout)
```

## Traceability

```
PLAN.md / HANDOFF.md / docs/SOURCE_MAP.md
    ↓
specs/0001–0013
    ↓
config/work_queue.json  ← pick tasks here (pick_task.py)
    ↓
packages/*  services/*  apps/*
    ↓
CI (.github/workflows/ci.yml)
```

## Adding a spec

1. Copy `0000-template.md` → `NNNN-name.md`.
2. Link related specs and list acceptance criteria with test file paths.
3. Update this README table when status changes.
4. ML changes: cite `SCIENCE_REVIEW.md` and define an eval gate in the spec.

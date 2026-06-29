# Specs

Spec-driven development. Code follows specs; specs follow `PLAN.md` and `SCIENCE_REVIEW.md`.

- Specs are numbered `NNNN-short-name.md` and written from `0000-template.md`.
- Status: **Draft → Ready → Implemented → Superseded**. Ship only from **Ready** or **Implemented**.
- Shipped specs are immutable. Changes get a new spec or a tracked revision note.
- ML specs MUST include an **evaluation gate** CI can enforce.

## Status matrix (2026-06-28)

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
| [0010](./0010-finance-applied-test.md) | Finance applied-test (Phase B) | **Draft** | `apps/sites/finance-lab` stub; from Google Doc 3 |
| [0011](./0011-modal-trainer-production.md) | Modal GPU trainer (production) | **Draft** | `services/trainer` stub |
| [0012](./0012-synthetic-org-divisions-and-handoffs.md) | Org divisions & closed loop | **Implemented** | registry + Phase A+ handoffs (`handoffs.py`, charters, control UI) |

**Production hosting:** Vercel (sites) + Railway (core-api + worker) + Neon Postgres — [ADR-002](../docs/adr/002-core-api-hosting.md), `infra/railway.md`.

## Traceability

```
PLAN.md / HANDOFF.md / docs/SOURCE_MAP.md
    ↓
specs/0001–0012
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

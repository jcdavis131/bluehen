# 0005 — Auto-Research Conductor

- **Status:** Partial
- **Owner:** Platform / Agent
- **Related specs:** 0003, 0004, 0006, 0009, 0012
- **Sources:** [`docs/sources/02-synthaembed-enterprise-platform.md`](../docs/sources/02-synthaembed-enterprise-platform.md) (Eve topology, ACTL KPI, zELO pipeline)
- **Implementation:** `app/services/lifecycle.py`, `scripts/kickoff_lifecycle.py`, Eve `hill_climb` tool

## Problem

A mini-org should improve continuously without a human tuning every hyperparameter — but naive
continuous training is expensive and overfits static eval sets.

## Goals

- Autonomous loop: collect → train → eval → deploy with ledger entries at each stage.
- Cost ceiling enforced before enqueue.
- Eval integrity via rotating slice + gates (Spec 0008).
- Cross-division handoffs per **Spec 0012** — Phase A+ wired (BD queue, charter gate, operator promote).

## Implemented (v0.3)

- **`hill_climb`:** ingest → chunk → pairs → ledger → `train/launch` (fixed `DEFAULT_RECIPE`).
- **Worker:** completes train, runs eval-harness, deploys + indexes (Spec 0009).
- **Scripts:** `bootstrap_orgs.py`, `kickoff_lifecycle.py`, `backfill_deploy.py`.
- **Eve tool:** `hill_climb.ts` → `synth.research.hillClimb`.

## Not yet implemented

- LLM-generated recipes with schema validation + guardrails.
- Eval-set rotation from production logs.
- **zELO / Thurstone continuous relevance** (Source 02 Stage 3) — today: pairwise nDCG only.
- **ACTL KPI** worker scoring (Source 02) — partial via budget tools.
- Arq/Redis queue (jobs live in Postgres `training_jobs`).
- Modal GPU trainer (`services/trainer` stub).
- GradNorm / multi-task balancing (Phase B finance).

## Design (target)

- **Trigger:** schedule, ledger stall, or effective-rank drop.
- **Recipe generation:** orchestrator LLM → Pydantic-validated recipe within allow-lists.
- **Cost ceiling:** check before every GPU enqueue.
- **Eval rotation:** disjoint slices; never train on eval queries.
- **Execution:** trainer job → metric delta → ledger append.

## Data model

`auto_research_ledger` — append-only, RLS-protected (migration `001`).

Fields used today: `stage`, `site_id`, `notes`, `model_version`, `trace_id`, `cost_usd`.

## Acceptance criteria

### Phase A minimum (v0.3 hill-climb)

| # | Criterion | Status |
|---|---|---|
| A1 | `pnpm kickoff:orgs` runs ingest → train → worker → deploy on local stack | ✅ |
| A2 | Loop never exceeds daily cost ceiling at enqueue | ✅ budget check in hill_climb |
| A3 | Ledger records collect + train (API) and train/eval/deploy/index (worker) | ✅ |
| A4 | Eve + scripts use synth-core only for hill-climb | ✅ |

### Full conductor (Phase A+)

| # | Criterion | Status |
|---|---|---|
| 1 | Recipe guardrails reject invalid configs before compute | ⏳ |
| 2 | Train/eval use disjoint rotating slices | ⚠️ demo pairs only; rotation TBD |
| 3 | Metric improves without rank collapse on fixture corpus | ⚠️ see EVIDENCE.md — WHITEPAPER gate 1 open |
| 4 | Research → BD queue auto-write after gates (Spec 0012) | ✅ worker + handoffs |
| 5 | LLM recipe generation with schema validation | ⏳ |

## Test plan

- Integration: `kickoff_lifecycle.py` against local stack.
- Future: `tests/test_recipe_validation.py`, `tests/test_eval_rotation.py`.

## Evaluation gate

Monotone improvement on rotating eval + effective rank above baseline under budget (Spec 0008).

## Risks

- LLM degenerate recipes → schema + gates (when LLM conductor lands).
- Overfitting static eval → rotation generator (TBD).

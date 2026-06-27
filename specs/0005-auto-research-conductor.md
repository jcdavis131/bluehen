# 0005 — Auto-Research Conductor

- **Status:** Draft
- **Related specs:** 0003, 0004
- **Reviewer note:** directly addresses the two risks Source 2 raised about itself
  (compute blowup, eval overfitting).

## Problem
A mini-org should improve continuously without a human tuning it — but naive continuous
training is expensive and overfits to a static eval set.

## Goals
- An autonomous loop: read ledger → find weakest slice → propose recipe → validate → train →
  evaluate → record delta.
- Make cost and eval-integrity *structural*, not optional.

## Design
- **Trigger:** schedule or ledger event (effective rank dropping, metric stalling).
- **Recipe generation:** the orchestrator LLM receives the recent ledger + the weakest eval
  slice and returns a structured recipe: tokenizer config (BPE/BLT), loss weights, LR
  schedule, PEFT target modules. Output is schema-validated (Pydantic) before use.
- **Guardrails:** recipes must stay within allow-listed ranges; **PEFT is the default** (the
  base/MoE routing layers stay frozen in early iterations).
- **Cost ceiling:** per-workspace `cost_ceiling_usd` enforced before enqueue; over-budget →
  the loop pauses and surfaces in the dashboard.
- **Eval-set rotation:** a generator synthesizes fresh eval slices from recent production
  logs on a rotating schedule, so the loop cannot overfit a fixed benchmark. Held-out slices
  never seen during a recipe's training.
- **Execution:** Arq enqueues a `trainer` job (ASN engine + eval-harness); on completion the
  metric delta is written to `auto_research_ledger`.
- **MTNN multi-task balancing (finance vertical):** when multiple heads are trained,
  λ-weights use **GradNorm or uncertainty weighting**, not static scaling — answering the
  open question Source 3 ended on.

## Data model
- `auto_research_ledger(id uuid pk, workspace_id, iteration_version int, tokenization_strategy,
  loss_config jsonb, eval_slice_id, metric_delta numeric, hyperparameters jsonb,
  model_weights_uri, cost_usd numeric, created_at)` — RLS-protected, append-only.

## Acceptance criteria
1. A generated recipe that violates guardrails is rejected before any compute is spent.
2. The loop never exceeds a workspace's daily cost ceiling.
3. Training and evaluation use disjoint eval slices; the rotation is recorded in the ledger.
4. Over N iterations on a fixture corpus, the rotating metric improves with no effective-rank
   collapse.

## Test plan
- `tests/test_recipe_validation.py`, `tests/test_cost_ceiling.py`,
  `tests/test_eval_rotation.py`; a simulated multi-iteration loop in integration tests.

## Evaluation gate
- **Rule:** the autonomous loop must show monotone-ish improvement on the rotating eval set
  (no regression beyond noise band) while effective rank stays above baseline, under budget.

## Risks
- LLM proposes degenerate recipes → schema + guardrails + eval gate catch them.
- Eval generator leaks training data into eval → disjointness asserted in tests.

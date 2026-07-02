# 0008 — Eval Harness & Deploy Gates

- **Status:** Implemented
- **Owner:** ML
- **Related specs:** 0003, 0004, 0005, 0009
- **Implementation:** `packages/eval-harness/`, `services/core-api/app/services/eval.py`

## Problem

Product claims about ASN quality must be **falsifiable in CI**, not asserted in marketing copy
(`SCIENCE_REVIEW.md` §5).

## Goals

- Reusable metrics: effective rank, nDCG@10, deploy gates.
- Worker and `/v1/eval/*` share the same harness.
- Gates recorded on `model_versions.meta` for operator review.

## Design

### Package (`packages/eval-harness`)

| Module | Purpose |
|---|---|
| `metrics.ndcg_at_k` | nDCG from relevance list |
| `metrics.retrieval_scores` | Cosine rank query vs docs |
| `gates.compute_gates` | rankAboveBaseline, ndcgNonRegression, mrlWithinTolerance |
| `runner.evaluate_checkpoint` | Load checkpoint, pairwise nDCG, effective rank, gates |

### Gate thresholds (v0.3)

- `rankAboveBaseline`: effective rank > 8.0
- `ndcgNonRegression`: nDCG@10 ≥ 0.35 (pairwise eval on real collection pairs)
- `mrlWithinTolerance`: fails closed when Matryoshka retrieval is unmeasured (no stub `True`)
- `sufficientEvalPairs`: ≥ 8 real collection pairs required (REV-905). Below the floor the
  gate fails closed — `run_eval_for_workspace` returns `allPassed=False` with
  `metrics.skipped="insufficient_real_pairs"` and does **not** substitute demo pairs. The
  hard-coded demo pairs survive only behind an explicit `allow_demo=True` opt-in for manual
  smoke; no production caller (`worker/main.py`, `/v1/eval/run`, lazy `gates_for_model`)
  sets it. Train minimum stays 10 (`services/worker/main.py`).

### API

- `POST /v1/eval/run` — run harness, persist `ndcg10`, `effective_rank`, gates on model row.
- `GET /v1/eval/{model_version}/gates` — read or lazy-run gates.

### Worker behavior

- Runs eval after train; records gates on model.
- Deploys latest model + pgvector index regardless of gate pass (v0.3 serving policy); gates
  stored for operator decisions.

## Evaluation gate (this spec)

| Metric | Dataset | Rule |
|---|---|---|
| Effective rank | Contrastive pairs from collection | > baseline 8.0 |
| nDCG@10 | Pairwise anchor vs pos/neg (k=2) | ≥ 0.35 |
| sufficientEvalPairs | Real collection pairs | ≥ 8 (fail closed, no demo fallback — REV-905) |
| Combined | `allPassed = all(gates.values())` | Recorded; promotion policy TBD |

## Acceptance criteria

1. `evaluate_checkpoint` returns `ndcg10`, `effectiveRank`, `gates`, `allPassed`. ✅
2. Deploy rank gate (erank > 8.0): **not met** on 2-epoch micro-ablation (erank ~7.37);
   fixed collapse trigger → no-harm parity at 30 ep (`EVIDENCE.md` §3.1). Prior ~62 reports
   **retracted**. 🟡
3. Eval results persisted on `model_versions` via worker/API. ✅
4. dumbmodel.com can surface effective rank / nDCG from demo baselines (`packages/eval-public`). ✅

## Test plan

- Harness imported by worker and core-api eval service.
- Future: dedicated `packages/eval-harness/tests/` in CI.

## Risks

- Demo pairwise nDCG is not full retrieval benchmark → slasso.com exam engine is Phase A surface test (TBD wire to live models).

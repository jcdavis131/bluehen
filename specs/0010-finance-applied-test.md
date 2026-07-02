# 0010 — Finance Applied-Test Org (Phase B)

- **Status:** Draft
- **Owner:** ML / Product
- **Related specs:** 0001, 0005, 0007, 0008, **0013** (omni-market expansion)
- **Sources:**
  - [`docs/sources/04-embedding-co-briefing.md`](../docs/sources/04-embedding-co-briefing.md)
  - [`docs/sources/05-mtnn-system-design.md`](../docs/sources/05-mtnn-system-design.md)
  - [`docs/sources/07-embedding-co-lifecycle-narrative.md`](../docs/sources/07-embedding-co-lifecycle-narrative.md)
  - [Google Doc 3](https://docs.google.com/document/d/14Rtz1r_3AQIM8cChKVsjPqt8kHH6PqV6RWPIEkH10Ik/edit)
  - `HANDOFF.md` §3b · `PLAN.md` §10 (trading risk)

## Problem

Phase A proves retrieval quality (nDCG, effective rank). Phase B must prove embeddings help
in **realistic finance scenarios** — RAG over filings, research, and market narrative — without
live trading or money movement.

Source docs describe a full **Multi-Task Neural Network (MTNN)** with MoE trunk, auxiliary
heads, and a differentiable Sharpe portfolio head. **Phase B implements only the simulation
slice** of that vision: RAG + paper backtests. Full MTNN training is Phase C+ / separate spec.

## Goals

- Finance mini-org tenant (`finance-lab`) with domain corpus and **fictional** strategy backtests.
- Separate eval gate from retrieval nDCG: simulated strategy outcomes on retrieved context.
- Consume Phase A org models that pass Spec 0008 gates.
- Preserve **point-in-time data integrity** (no look-ahead bias in eval fixtures).

## Non-goals (v1 guardrail — locked)

- Order execution, brokerage integration, or real capital.
- Live trading (Phase C — separate spec, Operator + compliance approval).
- Full MoE MTNN training in v1 (Sources 05–07 describe target architecture, not Phase B MVP).

## Design

### Four-org → Phase B mapping (from Sources 04, 07)

| Legacy org | Role | Phase B implementation |
|---|---|---|
| Org 1 · Data Operations | Point-in-time data lake | `data/corpora/finance-lab/` + gap-report fixtures |
| Org 2 · AI Architecture | SOTA embeddings | Phase A ASN models via `/v1/search` + `/v1/embed` |
| Org 3 · Quant Simulation | Stress testers | Auxiliary eval tasks on retrieved context (volatility regime labels, masked narrative QA) |
| Org 4 · Live Execution | Capital deployment | **Simulated only** — paper portfolio metrics, no orders |

The source **gap-analysis loop** (Org 4 → Org 1 mandate) becomes a **ledger event +
corpus patch** in simulation: attribution report → new fixture documents ingested → re-eval.

### Target MTNN architecture (future — Sources 05, 06)

Documented for traceability; not Phase B MVP:

- **Input:** NLP (SEC filings, BPE), time-series patches, macro embeddings.
- **Trunk:** Sparse MoE Transformer with modality routing.
- **Auxiliary heads:** volatility forecasting, masked market modeling, sector rotation (GradNorm balancing).
- **Primary head:** portfolio weights with differentiable Sharpe + turnover penalty:

  `L_portfolio = −(μ_p / σ_p) + γ Σ|w_t − w_{t−1}|`

- **ASN regularization:** effective-rank trigger → three-tier spectral surgery + Entorhinal bottleneck.

Phase B uses **retrieval + simulation harness** instead of end-to-end MTNN gradients.

### Phase B MVP stack

- **Site:** `apps/sites/finance-lab` (stub) — simulation dashboard.
- **Corpus:** SEC filings, research summaries, macro narrative (synthetic / historical fixtures).
- **RAG:** org-trained embed + search from Phase A passing models.
- **Simulation eval:** paper portfolios driven by retrieved context; metrics = Sharpe-like ratio
  + turnover penalty on **fictional** returns.
- **Package:** `packages/finance-eval/` (TBD) — isolated from live market APIs.

## Contract (draft)

- `POST /v1/finance/simulate` — `{ strategyId, corpusId, modelVersion }` → simulation report.
- Gate results stored in ledger with `stage: "finance_sim"`.

*(Routes not implemented — spec-first.)*

## Evaluation gate

| Metric | Rule |
|---|---|
| Retrieval nDCG@10 | Phase A passing model (0008) |
| Simulated strategy Sharpe (fictional) | Non-regression vs baseline embedder on same corpus |
| Effective rank | No collapse vs Phase A deploy |
| Look-ahead | Eval slice must be point-in-time; negative test rejects future-dated joins |

## Acceptance criteria

1. Finance org workspace provisioned via fleet bootstrap with isolated RLS.
2. Simulation uses only retrieved context — no direct price oracle in eval slice.
3. Results on finance-lab site + ledger; all copy marked **paper / simulation only**.
4. No API route moves real money.
5. Source MTNN "live execution" language scrubbed from UI (see `SCIENCE_REVIEW.md`).

## Test plan

- Unit: `packages/finance-eval/` with fixture corpus and known attribution gaps.
- Integration: hub or benchmark-lab model → search → simulate → ledger entry.
- Negative: attempt to pass future prices into eval → must fail.

## Risks

| Risk | Mitigation |
|---|---|
| Simulation mistaken for live alpha | Explicit copy on all surfaces; spec 0001 guardrails |
| MTNN portfolio head implies trading | Phase B = RAG + sim only; Sharpe on fictional returns |
| Look-ahead bias | Point-in-time fixtures + automated negative tests |
| "Mathematically equivalent" biology claims | `SCIENCE_REVIEW.md` — inspiration only in product copy |

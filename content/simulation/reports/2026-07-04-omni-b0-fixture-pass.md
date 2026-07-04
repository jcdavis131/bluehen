---
title: Omni-Market B0 fixture pass — baseline-momentum across four platforms
date: 2026-07-04
strategy: baseline-momentum
platforms: kalshi, polymarket, prizepicks, robinhood
status: fixture-pass
summary: First published run of the Omni-Market Alpha Engine harness — paper trades on the pinned fixture set with platform rule enforcement on all four registered platforms. Demonstrates the pipeline, not alpha.
---

# Omni-Market B0 fixture pass — baseline-momentum across four platforms

> **What this is.** A harness demonstration on the pinned fixture set
> (`data/omni/fixtures.jsonl`), published to exercise the full pipeline:
> platform registry → rule enforcement → paper trades → measured metrics →
> published report. **What this is not:** a performance claim. One to two
> trades per platform cannot support a Sharpe estimate; the numbers below are
> fictional by construction (Spec 0013 evaluation gate: fixture timestamps
> enforced, `mode: "simulation"` required).

## Run

- **Strategy:** `baseline-momentum` with `config/omni-skills/best_skill.md`
- **Corpus:** `omni-fixtures` (pinned, timestamp-enforced)
- **Command:** `uv run python scripts/omni_simulate.py --platform <id>`
- **Mode:** `simulation` on every response (gate-checked)

## Results by platform

| Platform | Trades | Sharpe (fictional) | Turnover | Bankroll (paper) | Rules applied |
|---|---|---|---|---|---|
| Kalshi | 2 | 13.55 | 2.5 | 10,000 → 10,043.75 | `kalshi-settlement` |
| Polymarket | 1 | 0.00 | — | flat | AMM slippage 50 bps modeled |
| PrizePicks | 2 | 2.14 | — | paper | flex payout caps enforced |
| Robinhood | 2 | 8.68 | — | paper | margin rules enforced |

Every trade log cites the RootMem rule ids it applied, per the Spec 0013
evaluation gate. The Kalshi Sharpe of 13.55 on two fixture trades is exactly
the kind of number that looks impressive and means nothing — we publish it to
make the point that trade count and fixture provenance must accompany any
metric before it can be read.

## What the pass verified

1. **Platform registry (RootMem)** — all four platforms load from
   `config/market-platforms.json` with execution constraints and rule units.
2. **Rule enforcement** — position caps, tick sizes, payout caps, and margin
   rules bind inside the simulation; every trade carries its applied rule ids.
3. **Mode guardrail** — every response carries `mode: "simulation"`; the v1
   wall (no live capital, no order execution) held throughout.
4. **Metric plumbing** — Sharpe, penalized Sharpe, turnover, and paper
   bankroll deltas compute and round-trip through the report pipeline.

## Next

- **B1:** real ingest (news, stats, filings) with semantic dedup replaces the
  fixture set — trade counts move from single digits to statistically usable.
- **SkillOpt:** bounded text-space edits to `best_skill.md`, gated on held-out
  validation Sharpe (`scripts/omni_loop.py`).
- Reports from B1 runs publish to this feed with the same honesty bar:
  fixture/corpus provenance, trade counts, and rule citations on every number.

---

*Simulation only. No live capital, no order execution, no trading advice
(Spec 0013 v1 guardrail, locked). Paper-trading reports are research
artifacts, not investment recommendations.*

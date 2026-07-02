# Omni-Market Trading Skill (v1 — simulation)

> **Mode:** paper / simulation only. No live capital. Gated by SkillOpt validation Sharpe.

## Core principles

1. Never violate platform rules in `config/market-platforms.json`.
2. Size positions under platform `executionConstraints`.
3. Prefer high-confidence edges where retrieval context supports the thesis.
4. Log every action to KAG (`data/omni/trajectories.jsonl`).

## Platform tactics

### Kalshi / Polymarket

- Enter when implied probability diverges from retrieved forecast by > 8%.
- Exit before resolution if edge compresses below 3%.
- Cap single-event exposure at 5% of simulated bankroll.

### PrizePicks

- Max 4 legs unless flex payout tier justifies 6-leg variance.
- Avoid correlated legs in same game (injury/news cluster risk).
- Require SmartSearch hit on player injury/status before prop entry.

### Robinhood

- Momentum entries on earnings surprise + filing retrieval support.
- Respect PDT counter; hold overnight to avoid day-trade flag when under $25k.
- No margin; cash-only fills at fixture bar open.

## Risk limits (simulation)

- Max drawdown halt: 15% from peak bankroll.
- Turnover penalty weight: 0.1 × |Δw| per rebalance.
- Sharpe target for SkillOpt promotion: > 0.5 on held-out fixtures.

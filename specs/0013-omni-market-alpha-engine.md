# 0013 — Omni-Market Alpha Engine (Phase B+)

- **Status:** Ready
- **Owner:** Platform / ML / Operator
- **Related specs:** 0001, 0005, 0007, 0008, 0010, 0012
- **Architecture companion:** [`docs/OMNI_MARKET_ARCHITECTURE.md`](../docs/OMNI_MARKET_ARCHITECTURE.md)
- **Machine-readable:** `config/market-platforms.json`, `config/omni-skills/`

## Problem

Phase A proves domain-specialized embeddings for RAG. Phase B (Spec 0010) scoped finance
simulation only. The strategic aperture now spans **prediction markets, sports DFS, and retail
brokerages** — disjoint domains with incompatible rules, margins, and execution constraints.

A single static prompt cannot reason across Kalshi event contracts, PrizePicks flex-play payout
caps, Robinhood margin rules, and Polymarket liquidity. We need a **simulation-first omni-market
org** with platform-aware memory, deterministic retrieval, and text-space strategy optimization
before any live-capital phase.

## Goals

- Extend the four-org pipeline (Data → Research → Simulation → Orchestration) to omni-market domains.
- **RootMem-style platform rules** as structured config + root memory units (`config/market-platforms.json`).
- **SmartSearch-inspired** LLM-free retrieval for rule + corpus recall (`packages/omni-sim`).
- **Paper-trading simulation** across platforms with Sharpe-like gates (`packages/omni-sim`, `POST /v1/omni/simulate`).
- **SkillOpt loop** — bounded markdown skill edits gated on validation Sharpe (`config/omni-skills/`, `scripts/omni_loop.py`).
- **KAG trajectories** — evidence/action/observation/verifier tuples in `data/omni/trajectories.jsonl`.
- **finance-lab** site as the public Simulation Lab surface (Phase B active, simulation copy).
- **Unified CLI** — `synth omni platforms|simulate|skill` for agent workerbees (Spec 0006).

## Non-goals (v1 guardrail — locked)

- Live order execution, brokerage OAuth, or real capital on any platform.
- Regulatory compliance packaging for licensed sports betting or securities trading.
- Full Agents-A1 35B MoE, Slime async RL, or MTP inference — documented as Phase C+ research targets.
- Replacing ASN embedding research — omni-market uses Phase A models via `/v1/search` where applicable.

## Phased delivery

| Phase | Scope | Artifact |
|---|---|---|
| **B0** (this spec) | Platform registry, sim harness, API, CLI, finance-lab UI | `packages/omni-sim`, `/v1/omni/*` |
| **B1** | Crawl4AI ingest stubs, semantic dedup on omni corpus | `data/corpora/omni-market/` |
| **B2** | TradingAgents-style multi-agent firm sim | `packages/omni-sim/firm_env.py` |
| **C** | Operator-approved live execution per platform | Separate spec + compliance review |

## Design

### Four-org mapping (Omni-Market Edition)

| Division | Codename | Omni-market role |
|---|---|---|
| Data | Miners | Omni-channel ingest (news, stats, filings); semantic dedup; DCLM quality gate |
| Research | Architects | SmartSearch + RootMem; ASN embeddings for cross-domain retrieval |
| BD / Simulation | Stress Testers | TradingAgents + AI-Trader benchmarks; SkillOpt on `best_skill.md` |
| Execution | Traders | **Simulation only** — paper trades; Slime RL deferred to Phase C+ |
| Orchestration | Eve + CLI | `scripts/omni_loop.py` workerbee; hill-climb on weakest platform slice |

### Platform registry (RootMem)

Each platform entry in `config/market-platforms.json`:

```json
{
  "id": "prizepicks",
  "rules": ["6-pick flex max payout 25x", "..."],
  "executionConstraints": { "maxLegs": 6, "liveCapital": false },
  "rootMemoryUnits": [{ "rules": "...", "evidence": "..." }]
}
```

### SmartSearch pipeline (CPU, LLM-free)

1. **Parse** — extract weighted terms from query (proper nouns > nouns > verbs).
2. **Recall** — substring grep over corpus + platform rules.
3. **Rank** — reciprocal rank fusion of overlap score + optional cross-encoder hook (future).
4. **Truncate** — score-adaptive cutoff `τ = α · max(score)`.

### Simulation contract

`POST /v1/omni/simulate`

```json
{
  "platformId": "kalshi",
  "strategyId": "baseline-momentum",
  "corpusId": "omni-fixtures",
  "skillPath": "config/omni-skills/best_skill.md"
}
```

Response: `{ sharpe, turnover, trades, platformRulesApplied, mode: "simulation" }`

Ledger stage: `omni_sim`.

### SkillOpt loop (text-space)

1. Rollout paper trades with current `best_skill.md`.
2. Reflect on KAG minibatch failures.
3. Propose bounded add/delete/replace edits (`scripts/omni_loop.py --dry-run`).
4. Gate on held-out validation Sharpe; reject repeats via edit buffer.

## Evaluation gate

| Metric | Rule |
|---|---|
| Mode | Response MUST include `mode: "simulation"` |
| Sharpe (fictional) | Non-regression vs baseline skill on same fixture set |
| Platform rules | Every trade log cites applied rule ids from RootMem |
| Look-ahead | Fixture timestamps enforced; future join → hard fail |
| Live capital | Any route setting `liveCapital: true` → 403 |

## Acceptance criteria

1. `config/market-platforms.json` lists Kalshi, PrizePicks, Robinhood, Polymarket with rules.
2. `packages/omni-sim` passes unit tests; `uv run pytest packages/omni-sim/tests -q`.
3. `POST /v1/omni/simulate` returns simulation report + ledger `omni_sim` entry.
4. `synth omni platforms` and `synth omni simulate` work against local API.
5. `apps/sites/finance-lab` shows platform cards + simulation disclaimer on all surfaces.
6. `scripts/omni_loop.py` runs one SkillOpt iteration (dry-run default).
7. No UI or API implies live trading without Operator charter (Spec 0001).

## Test plan

- Unit: `packages/omni-sim/tests/test_smart_search.py`, `test_sim_env.py`
- Integration: CLI simulate → API → ledger tail contains `omni_sim`
- Negative: simulate with `liveCapital: true` in request → 403
- Negative: fixture with future-dated outcome → validation error

## Risks

| Risk | Mitigation |
|---|---|
| Simulation mistaken for live alpha | Badge + copy on finance-lab; `mode: simulation` in API |
| Platform ToS / regulatory | Simulation only; live = Phase C separate spec |
| Research framework names oversold | `docs/OMNI_MARKET_ARCHITECTURE.md` maps aspirational → implemented |
| Scope creep into live trading | Spec 0001 guardrail; Operator charter for Phase C |

# Omni-Market Alpha Engine — Architecture (v4.0)

> **Status:** Phase B0 (simulation) · **Normative spec:** [`specs/0013-omni-market-alpha-engine.md`](../specs/0013-omni-market-alpha-engine.md)  
> **Guardrail:** v1 = simulation only. Live execution requires Operator charter + separate Phase C spec.

---

## Strategic overview

The Omni-Market Alpha Engine evaluates statistical disparities and arbitrage opportunities
across equities (Robinhood), event prediction markets (Kalshi, Polymarket), and daily fantasy
sports (PrizePicks) — within a **single synthetic organization** that shares Blue Hen RE's
`core-api`, Eve orchestration, and unified `synth` CLI.

Research frameworks referenced in the strategic brief are mapped to **implementable** vs **Phase C+** below.

---

## Framework traceability

| Research reference | Role | Implementation (repo) | Phase |
|---|---|---|---|
| **RootMem** | Platform-specific execution rules | `config/market-platforms.json` root memory units | B0 ✅ |
| **EverMemOS** | Streaming facts → MemCells | Ledger `omni_sim` + `data/omni/trajectories.jsonl` | B0 ✅ |
| **SmartSearch** | LLM-free retrieval | `packages/omni-sim/omni_sim/smart_search.py` | B0 ✅ |
| **SkillOpt** | Text-space strategy edits | `config/omni-skills/best_skill.md`, `scripts/omni_loop.py` | B0 ✅ |
| **TradingAgents / AI-Trader** | Multi-agent firm backtest | `packages/omni-sim/omni_sim/sim_env.py` (paper) | B0 ✅ |
| **KAG** | Evidence-action graph | `omni_sim/kag.py` → `trajectories.jsonl` | B0 ✅ |
| **Crawl4AI / olmOCR / MinerU** | Omni ingest | `data/corpora/omni-market/` stubs | B1 |
| **Agents-A1** | 35B MoE multi-domain reasoning | Documented; Eve + subagents today | C+ |
| **Slime / MTP / TITO** | Async RL + inference speedup | Documented; not in inference path | C+ |
| **DSA / MLA** | Long-context attention | ASN engine separate track (Spec 0003) | Research |

---

## System diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Orchestration (Eve + synth CLI + omni_loop.py workerbees)              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ finance-lab   │     │ core-api        │     │ packages/       │
│ (Simulation   │────▶│ /v1/omni/*      │────▶│ omni-sim        │
│  Lab UI)      │     │ ledger omni_sim │     │ smart_search    │
└───────────────┘     └────────┬────────┘     │ sim_env · kag   │
                               │              └────────┬────────┘
                               ▼                       ▼
                    ┌─────────────────────┐   ┌─────────────────────┐
                    │ Phase A /v1/search  │   │ market-platforms    │
                    │ (ASN embeddings)    │   │ omni-skills         │
                    └─────────────────────┘   └─────────────────────┘
```

---

## Four-organization pipeline

### 1. Data Operations (Miners)

- Ingest heterogeneous sources: player stats, SEC filings, geopolitical news.
- **B0:** `data/omni/fixtures.jsonl` + `data/corpora/omni-market/README.md`
- **B1:** Crawl4AI scrapers, semantic dedup, DCLM quality classifier

### 2. AI & Representation (Architects)

- SmartSearch for rule + corpus recall without LLM loops.
- RootMem units per platform in `config/market-platforms.json`.
- Phase A ASN models via `/v1/search` for narrative RAG context.

### 3. Quant Simulation (Stress Testers)

- Paper trades in `sim_env.py` with platform rule enforcement.
- SkillOpt proposes edits to `best_skill.md`; gates on validation Sharpe.
- KAG logs `(s_t, a_t, o_t, v_t)` tuples.

### 4. Live Execution (Traders)

- **B0–B2:** Simulation only. UI badge: "Phase B · simulation".
- **Phase C:** Operator charter per platform; separate compliance spec.

---

## Module specs (implemented)

### A. Multi-Platform Memory & Retrieval

See `packages/omni-sim/omni_sim/smart_search.py` and `platforms.py`.

### B. Strategy Optimization

See `scripts/omni_loop.py` and `config/omni-skills/best_skill.md`.

### C. Continuous Learning (deferred)

Slime async RL, Agents-A1 MoE, MTP — design targets for Phase C+ when simulation gates pass.

---

## Operator runbook

```bash
# Run simulation (no Docker required)
uv run python scripts/omni_simulate.py --platform kalshi

# Agent workerbee loop (dry-run SkillOpt)
uv run python scripts/omni_loop.py --iterations 1

# Via unified CLI (requires API)
synth omni platforms
synth omni simulate kalshi --strategy baseline-momentum

# Full stack (when BLK-DISK/Docker unblocked)
pnpm dev:api
curl -X POST localhost:8000/v1/omni/simulate -H "Authorization: Bearer $SYNTH_API_KEY" \
  -d '{"platformId":"kalshi","strategyId":"baseline-momentum"}'
```

---

## Related documents

- [`PLAN.md`](../PLAN.md) §12 — roadmap integration
- [`specs/0010-finance-applied-test.md`](../specs/0010-finance-applied-test.md) — Phase B parent
- [`specs/0012-synthetic-org-divisions-and-handoffs.md`](../specs/0012-synthetic-org-divisions-and-handoffs.md) — division handoffs
- [`config/market-platforms.json`](../config/market-platforms.json) — platform registry

# Omni-Market Fleet Skill

Load when operating across Kalshi, Polymarket, PrizePicks, Robinhood simulation surfaces.

## Guardrail

**Simulation only.** Never place live orders. `liveCapital: false` is enforced in API and registry.

## Workerbee commands

```bash
uv run python scripts/omni_simulate.py --list-platforms
uv run python scripts/omni_simulate.py --platform kalshi
uv run python scripts/omni_loop.py --iterations 1
synth omni platforms
synth omni simulate prizepicks --strategy baseline-momentum
```

## Division routing

| Task | Division | Agent |
|---|---|---|
| Corpus harvest (sports, filings, news) | data | data_harvester |
| Embedding / retrieval quality | research | training_orchestrator |
| Paper sim + SkillOpt | bd | qa_benchmark |
| API `/v1/omni/*` deploy | execution | field_operator |
| Cross-platform priorities | orchestration | Eve Chief of Staff |

## Artifacts

- Platform rules: `config/market-platforms.json`
- Trading skill: `config/omni-skills/best_skill.md`
- KAG trajectories: `data/omni/trajectories.jsonl`
- Spec: `specs/0013-omni-market-alpha-engine.md`

## When simulation Sharpe regresses

1. Read latest KAG trajectories for failed verifier outcomes.
2. Run `omni_loop.py` dry-run; propose SkillOpt edit.
3. If platform rule violation → update RootMem in `market-platforms.json`, not skill.
4. Record ledger `omni_sim` via API simulate call.

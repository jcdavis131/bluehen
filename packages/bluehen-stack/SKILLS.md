# Skills index

Reusable agent skills that exist today in the monorepo (curation-needed for
standalone `bluehen-stack` distribution — see `manifest.json`). Descriptions
below are taken directly from each file.

## `config/omni-skills/`

| File | One-line description |
|---|---|
| `best_skill.md` | Omni-Market Trading Skill (v1 — simulation) — paper/simulation-only trading tactics across Kalshi/Polymarket/PrizePicks/Robinhood, gated by SkillOpt validation Sharpe. |

## `apps/synthorg/agent/skills/`

| File | One-line description |
|---|---|
| `deploy-checklist.md` | Pre-deployment verification checklist — use before shipping a release, a change with DB migrations or feature flags, or verifying CI status/approvals ahead of production. |
| `eval-gates.md` | Evaluation Gates — load when deciding whether a model may advance; defines the effective-rank / nDCG@10 / Matryoshka-truncation / train-eval-disjoint gates a candidate must pass. |
| `lifecycle.md` | The Model Lifecycle — load when planning or sequencing work; the four-stage Collect → Train/validate → Applied test → Real-world use pipeline, one subagent per stage. |
| `omni-market.md` | Omni-Market Fleet Skill — load when operating across Kalshi/Polymarket/PrizePicks/Robinhood simulation surfaces; simulation-only guardrail, workerbee commands, division routing. |

## Status

Both directories are readable and usable inside the monorepo today. They are
marked **curation-needed** in `manifest.json` because several reference
monorepo-specific paths that a standalone package would need to generalize
or vendor:

- `config/omni-skills/best_skill.md` → `config/market-platforms.json`,
  `data/omni/trajectories.jsonl`
- `apps/synthorg/agent/skills/eval-gates.md` → `/WHITEPAPER.md` §8
- `apps/synthorg/agent/skills/omni-market.md` → `config/market-platforms.json`,
  `config/omni-skills/best_skill.md`, `specs/0013-omni-market-alpha-engine.md`

No skill files were dropped from this index; this is the full current set
under both directories.

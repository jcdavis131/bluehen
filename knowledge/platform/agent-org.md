---
type: Service
title: Agentic Org Teams (agentkit)
description: GLM-powered autonomous teams running the Data Harvesting, R&D, and Operations functions — deterministic duties always, LLM judgment when configured.
resource: /packages/agentkit
tags: [agents, glm, org, automation]
timestamp: 2026-07-02T00:00:00Z
---

Spec 0014. The five-division operating loop run as agents. Three teams,
each mapped to a division, each with two layers of duties:

| Team | Division | Deterministic (always run) | LLM loop (needs `GLM_API_KEY`) |
|---|---|---|---|
| `data-harvesting` | data | dataset-builder watch tick; dataset inventory | curate new sources (additive-only registry writes) |
| `rnd` | research | research-queue snapshot; telemetry/collapse review | rank next experiments; flag collapse follow-ups |
| `operations` | orchestration | blockers report; datalab/runboard health | Operator status digest with unblock actions |

# Model

Default **GLM 5.2** via any OpenAI-compatible endpoint:
`GLM_API_KEY` (required for LLM duties), `GLM_BASE_URL`
(default `https://api.z.ai/api/paas/v4`), `GLM_MODEL` (default `glm-5.2`).
Without a key, teams still run — deterministic duties are load-bearing;
the LLM only adds judgment.

# Safety rails

Per-team tool allowlists (no shell access — platform tools only), bounded
loops (`max_turns=8`), full call transcripts in `data/agents/<run>/`, and
write access limited to: the dataset-source registry (additive),
`knowledge/teams/`, and `data/agents/`. Training code and deploys are
out of reach by construction.

# Running

```powershell
uv run python -m agentkit list
uv run python -m agentkit run data-harvesting --once
uv run python -m agentkit run operations --loop 1440   # daily
```

Cadence policy: `config/agent_teams.json`. Run reports append to the
living logs in [/teams/](/teams/index.md).

# Citations

[1] [Spec 0014](/../specs/0014-agentic-org-teams.md)
[2] [Runtime](/../packages/agentkit)
[3] [Offline eval gate](/../packages/agentkit/tests/test_agentkit.py)

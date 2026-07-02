# Spec 0014 — Agentic org teams (GLM-powered) + commerce boot

**Status:** Ready (implementation in progress 2026-07-02) · **Owner:** Operator · **Author:** Claude

## Goal

Stand the five-division operating loop (Spec 0012) up as *running agents*
rather than manual lanes: three autonomous teams — **Data Harvesting**,
**R&D**, and **Operations** — powered by an open-weight LLM (GLM 5.2 by
default, any OpenAI-compatible endpoint), operating the platform through
the same tool surfaces humans use (work queue, datalab, runboard,
knowledge bundle). In parallel, boot the Medusa commerce backend against
a real Postgres so the commercial path is live end-to-end.

## Non-goals

- No live trading (Spec 0013 rule stands).
- Agents do not edit training code (`autoresearch_train.py` stays in the
  Claude/Cursor delegate lanes; agents may *queue* work, not merge it).
- No autonomous deploys — deploy gates + Operator promotion unchanged.

## Design

### Runtime: `packages/agentkit` (Python)

| Module | Responsibility |
|---|---|
| `llm.py` | OpenAI-compatible chat client (httpx). Env: `GLM_API_KEY`, `GLM_BASE_URL` (default `https://api.z.ai/api/paas/v4`), `GLM_MODEL` (default `glm-5.2`). No key → explicit `LLMUnavailable`, teams fall back to their deterministic duties. |
| `tools.py` | Typed tool registry with JSON-schema export for tool-calling. Platform tools only — no arbitrary shell. |
| `agent.py` | Single agent: system charter + tool loop (bounded turns, transcript to `data/agents/<run>/`). |
| `team.py` | Team = charter + members + duties. `run_team()` executes deterministic duties first (always), then the LLM planning/execution loop when configured. Emits a run report into the OKF bundle (`knowledge/teams/`). |
| `teams.py` | The three team definitions (below). |
| `__main__.py` | `python -m agentkit {list,run <team> [--once|--loop]}`. |

Config: `config/agent_teams.json` (operator-facing schedule + model
policy; charters/duties/allowlists live in code, `agentkit/teams.py`).
Registry entry added to `config/agents.json`.

### Teams → divisions (Spec 0012 mapping)

| Team | Division | Deterministic duties (no LLM needed) | LLM duties (when key set) |
|---|---|---|---|
| `data-harvesting` | data | run `datalab watch` tick; report new/unchanged datasets | curate new sources into the registry; summarize dataset deltas into OKF |
| `rnd` | research | list open AR-*/RAG-* queue items + latest run telemetry | prioritize the delegate queue; draft hypothesis notes; flag collapse events |
| `operations` | orchestration/execution | blockers report; task-queue hygiene (stale claims); telemetry health check | triage blockers into recommended actions; draft status digest |

### Safety rails

- Tool allowlist per team; every tool call logged to the transcript.
- Bounded loop (`max_turns`, default 8) and per-run wall-clock budget.
- Agents write only to: work-queue claims, `knowledge/teams/`, `data/agents/`,
  and `config/datalab_sources.json` (data team, additive only).
- No secrets in config; key via env only.

### Eval gate (SDD requirement)

`packages/agentkit/tests` must pass with **no network and no key**:
tool registry schemas, team loading, deterministic duty execution, and a
full team run against a stubbed LLM. CI runs them with the other suites.

## Commerce boot (this session)

Native PostgreSQL 17 (winget) on **:5432** — Docker's dead proxy squats
:5433. `medusa` database + role; migrate, admin user, seed, boot,
verify `/health` + Store API products; wire hub `.env.local`.

## Implementation plan (executed top-to-bottom)

1. ~~Spec + plan (this file); specs/README row.~~
2. Free disk (build outputs) → winget PostgreSQL 17 → create role/db.
3. `services/commerce`: `npm install` (own lockfile) — background.
4. `packages/agentkit`: llm/tools/agent/team/teams + CLI + tests.
5. `config/agent_teams.json` + agents.json registry + OKF concepts
   (`knowledge/platform/agent-org.md`, `knowledge/teams/index.md`).
6. Medusa: migrate → admin user → seed → start → verify Store API →
   hub `.env.local` (`COMMERCE_PROVIDER=medusa`, printed key/region).
7. Run each team `--once` (deterministic mode; LLM mode too if
   `GLM_API_KEY` present) — reports land in `knowledge/teams/`.
8. Full test sweep + typechecks → commit → push.

## Acceptance criteria

- [ ] `python -m agentkit run data-harvesting --once` executes a watch
      tick and writes an OKF team report (no key required).
- [ ] `python -m agentkit run rnd --once` and `run operations --once`
      produce queue/telemetry reports (no key required).
- [ ] With `GLM_API_KEY`, the same commands run the LLM loop with
      tool-calling against GLM (model env-overridable).
- [ ] Medusa answers `GET /health` and lists ≥2 seeded products via the
      Store API with the seeded publishable key.
- [ ] agentkit tests green offline; CI includes them.

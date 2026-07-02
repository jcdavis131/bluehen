# OpenCode self-continuing loop

Unattended multi-turn coding via [`opencode run`](https://opencode.ai/docs/cli/) and
[`opencode run --continue`](https://opencode.ai/docs/cli/). Distinct from autoresearch
(`scripts/autoresearch_*.py`) and the Cursor bridge hook (`.cursor/hooks/opencode-bridge-context.mjs`).

**Shared with Claude + Cursor:** [`docs/wiki/SESSION_BOOT.md`](./wiki/SESSION_BOOT.md) ·
[`config/agents.json`](../config/agents.json) · B.U.I.L.D. triage in
[`docs/wiki/IMPROVEMENT_LOOP.md`](./wiki/IMPROVEMENT_LOOP.md).

## What “loop” means here

| Concept | Behavior |
|--------|----------|
| **Turn 1** | `opencode run` with your goal plus a strict no-human protocol |
| **Turn 2+** | `opencode run --continue` in the same session |
| **Success** | Agent output contains `<<<TASK_COMPLETE>>>` (and optional test gate passes) |
| **Escalate** | Agent output contains `<<<NEED_HUMAN>>>` → script exits for you |
| **Cap** | `-MaxIter` (default 20) |
| **Logs** | `.opencode-loop/` under the work directory |

## Install

```powershell
npm i -g opencode-ai
# OpenCode recommends WSL2 on Windows for the smoothest experience; native npm works too.
opencode auth login
# OpenCode Zen (default) or OpenRouter — pick the provider you want.
```

## Config

Project config: [`opencode.json`](../opencode.json) at repo root (overrides global
`~/.config/opencode/opencode.json` for runs in this tree).

- Model (Zen): `opencode/deepseek-v4-flash-free` — matches `opencode auth login` → OpenCode Zen
- Alternative (OpenRouter): `openrouter/deepseek/deepseek-v4-flash:free` after `opencode auth login` → OpenRouter
- **Instructions:** `docs/wiki/SESSION_BOOT.md`, `GOALS.md`, `IMPROVEMENT_LOOP.md`, fleet rules
- Permissions: `edit`, `webfetch` → `allow`; `question` → `deny`
- **Production bash denied:** `vercel deploy`, `pnpm prod:deploy*`, `prod-deploy.mjs`, Vercel API
  `curl` — see [`docs/opencode/GUARDRAILS.md`](./opencode/GUARDRAILS.md)

If OpenRouter free tier 404s, drop `:free` in `opencode.json`. List models with
`opencode models opencode` or `opencode models openrouter`.

## Quick start

From repo root:

```powershell
.\scripts\opencode-loop.ps1 -Goal "Add a /health endpoint and make its test pass" -WorkDir C:\Users\jcdav\bluehenre
```

Double-click or cmd:

```cmd
scripts\opencode-loop.cmd -Goal "..." -WorkDir C:\Users\jcdav\bluehenre
```

## Fix-until-green (recommended)

Objective stop condition aligned with this repo’s gate culture (`pnpm review`, pytest, etc.):

```powershell
.\scripts\opencode-loop.ps1 `
  -Goal "Fix failing core-api health tests" `
  -WorkDir C:\Users\jcdav\bluehenre `
  -FixUntilGreen `
  -TestCmd "uv run pytest services/core-api/tests/test_health.py -q"
```

The script runs `-TestCmd` after `<<<TASK_COMPLETE>>>`. If tests fail, it feeds stderr/stdout
into the next `--continue` turn instead of exiting.

## Flags

| Flag | Purpose |
|------|---------|
| `-Goal` | Task description (make it verifiable) |
| `-WorkDir` | Directory passed to `opencode run --dir` |
| `-Agent` | B.U.I.L.D. boot context (`cursor`, `claude`, `opencode`, `opencode-research`) |
| `-OpenCodeAgent` | OpenCode subagent slug (e.g. `research` for autoresearch delegate) |
| `-MaxIter` | Hard iteration cap |
| `-TestCmd` | Shell command; exit code 0 = pass |
| `-FixUntilGreen` | Require `-TestCmd` to pass before success exit |
| `-Model` | Override model (`provider/model`) |
| `-BackoffSec` | Pause after OpenCode errors |
| `-SkipPermissions` | Pass `--dangerously-skip-permissions` to `opencode run` |
| `-NoPure` | Disable `--pure` (loads global plugins/MCP; slower, can hang on Windows) |
| `-BashTimeoutMs` | OpenCode bash tool timeout in ms (default: OpenCode’s 120000). Example: `7200000` = 2h |

## Long-running commands

`loop.ps1` has **no per-turn wall-clock cap** — it waits until `opencode run` exits. If bash
commands die after **2 minutes**, raise OpenCode’s bash timeout:

```powershell
# 2 hours (recommended for pytest/build loops)
.\scripts\opencode-loop.ps1 -Goal "..." -WorkDir C:\Users\jcdav\bluehenre -BashTimeoutMs 7200000 -SkipPermissions

# Or set for all sessions (persistent)
[System.Environment]::SetEnvironmentVariable("OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS", "7200000", "User")
```

`-MaxIter` caps **turn count**, not time — raise it for multi-hour jobs (e.g. `-MaxIter 50`).

## Troubleshooting

`opencode run` with no output for minutes: first run cold-starts (snapshot, watcher) and can take
**30–60s** before the model replies. The loop passes `--print-logs` and `--pure` by default.
Smoke test (expect ~30s):

```powershell
opencode run --pure --print-logs --dangerously-skip-permissions --dir C:\Users\jcdav\bluehenre "Reply with exactly: OK"
```

Zen free tier works without billing; you may see a harmless `No payment method` error from the
title agent (`gpt-5-nano`) in logs — the main model (`deepseek-v4-flash-free`) still runs.

## Free-tier gotchas

- OpenCode Zen free models can change; run `opencode models opencode` to confirm slugs.
- Loops only work as well as the goal — include a test or build the agent can run.
- **Research subagent:** `.opencode/agents/research.md` — AR-* delegate; use `-OpenCodeAgent research`.
- Global config may point at Cursor via `cursor-acp`; project `opencode.json` selects
  the unattended model for runs in this repo.

## References

- [OpenCode CLI](https://opencode.ai/docs/cli/)
- [DeepSeek V4 Flash (free) on OpenRouter](https://openrouter.ai/deepseek/deepseek-v4-flash:free)
- [DeepSeek + OpenCode setup](https://haimaker.ai/blog/deepseek-opencode-setup/)

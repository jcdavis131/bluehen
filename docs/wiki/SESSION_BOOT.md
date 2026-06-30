# Session boot — all agents (Cursor, Claude, OpenCode)

Runtime-neutral init. Environment-specific lanes live in each agent's entrypoint.

## 1. Orient (every session)

```powershell
cd C:\Users\jcdav\bluehenre
uv run python scripts/pick_task.py blockers
uv run python scripts/pick_task.py list
```

Read: [GOALS.md](./GOALS.md) · [BUILD.md](./BUILD.md) · [LOCAL_DEV.md](./LOCAL_DEV.md) ·
`TASKS.md` · linked spec in `specs/`

## 2. Claim work

Replace `<agent>` with your runtime id (`cursor`, `claude`, or `opencode`):

```powershell
uv run python scripts/pick_task.py claim <TASK-ID> --agent <agent>
```

| Agent | Typical prefixes | Entrypoint |
|---|---|---|
| **cursor** | SITE-*, INF-*, SPEC-* | `.cursor/rules/00-fleet-team.mdc` |
| **claude** | AR-*, RT-*, DATA-* | `.claude/CLAUDE.md` |
| **opencode** | SITE-* (bucket-1), scripted goals | `opencode.json` + `docs/OPENCODE_LOOP.md` |

Registry: `config/agents.json`

## 3. Classify before high-stakes edits

```powershell
uv run python scripts/build_sync.py classify --path path/to/file
```

| Bucket | Meaning |
|---|---|
| **bucket-1** | Proceed (docs, typos, tests) |
| **bucket-2** | Sign-off required (API routes, migrations, fleet.json) |
| **bucket-3** | Human judgment (architecture, ML recipes, ADRs) |

OpenCode unattended: **bucket-1 only**, or bucket-2 with `-FixUntilGreen -TestCmd`.

## 4. Finish

```powershell
uv run python scripts/pick_task.py done <TASK-ID>
uv run python scripts/pick_task.py render
```

Measured results → append `EVIDENCE.md` when applicable.

## 5. Context refresh (optional)

Compact boot block for prompts / loop turn 1:

```powershell
uv run python scripts/build_sync.py context --agent cursor --digest
uv run python scripts/build_sync.py context --agent claude --digest
uv run python scripts/build_sync.py context --agent opencode-research --digest
```

Cursor injects `context --agent cursor --digest` automatically via `.cursor/hooks/build-session-context.mjs`.

Ingest session logs into raw (all agents):

```powershell
pnpm build:inflow-sessions
pnpm build:reflect
```

## Hard rules (all runtimes)

1. One task claimed at a time — check `claimedBy` in work_queue
2. Sites → `core-api` only via `synth-core` (known gap: `ui-fleet/site-api.ts` — see [TECH_DEBT.md](./TECH_DEBT.md))
3. ML claims match `EVIDENCE.md` · no ASN surgery as default
4. v1 simulation only — no live trading

# Collaborative agent team — Blue Hen RE

Single queue: **`config/work_queue.json`** · Intake: **`scripts/pick_task.py`**

## Roster

| Agent | Environment | Division | Primary tasks |
|---|---|---|---|
| **Cursor** | Cursor IDE | execution, comms, infra | SITE-*, INF-* (code), core-api, ui-fleet, sync scripts |
| **Claude** | Claude Code / terminal | research | AR-306–309, RT-* bake-offs, `.claude/autoresearch-delegate.md` |
| **OpenCode** | OpenCode CLI (`opencode run`) | execution, comms | Bucket-1 SITE-* via `opencode-loop.ps1`; shares `docs/wiki/SESSION_BOOT.md` |
| **Eve** | synthorg (`apps/synthorg`) | agent + execution | SPEC-006, hill-climb via tools, weakest-slice retrain |
| **Research loop** | background daemon | research | AR-301–305 patches, literature radar — `pnpm research:loop` |
| **Operator** | human | infra | BLK-PROD: Neon, Railway, Vercel, disk recovery |

## Handoff protocol

```
pick_task.py list
  → claim (one agent, one task)
  → read spec + HANDOFF context
  → implement / experiment
  → done + render
  → optional: append EVIDENCE.md if measured
```

**Do not** work the same task ID concurrently. Check `claimedBy` in work_queue.

## Division → task prefixes

| Prefix | Division | Example |
|---|---|---|
| INF- | infra | stack, Railway, Vercel |
| AR- | research (synthetic) | autoresearch patches / delegate |
| RT- | research (real text) | realtext_methods, collapse_regime |
| RAG- | RAG corpus + retrieval | harvest, chunk ablation, exams |
| SRV- | serving | MRL deploy, pgvector index |
| SITE- | comms / UI | museum pages, methods page |
| BD- | business development | slasso exams, scorecards |
| SPEC- | cross-cutting spec work | Eve, Modal |
| DATA- | data org | literature radar, domain sweep |

## Autoresearch split

| Who | What |
|---|---|
| **Daemon / Cursor orchestrator** | Constant patches (BARLOW_LAMBDA, BATCH, LR) — no architecture edits |
| **Claude delegate** | Architecture / loss changes in `autoresearch_train.py` |
| **Either** | After 3× KEEP → trigger RT-401 real-text gate |

## Blockers (shared)

Always run `pnpm work:blockers` first. If BLK-DISK active, Claude/Cursor still ship: SITE-*, script impl, AR-306+ code edits. Blocked: kickoff, migrate, realtext training runs.

## Docs map

| Doc | Audience |
|---|---|
| `docs/wiki/SESSION_BOOT.md` | **All agents** (Cursor, Claude, OpenCode) |
| `docs/AGENT_INIT.md` | Any new agent |
| `AGENTS.md` | Cursor + pair programming |
| `config/agents.json` | Agent registry + session ingest paths |
| `infra/railway.md` | Operator — prod deploy |
| `.claude/CLAUDE.md` | Claude Code |
| `docs/OPENCODE_LOOP.md` | OpenCode unattended loops |
| `program.md` | Autoresearch rules |
| `HANDOFF.md` | Mission + repo map |
| `specs/README.md` | Feature acceptance |

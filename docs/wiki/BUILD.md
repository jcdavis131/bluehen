# B.U.I.L.D. framework

**Philosophy:** Action supersedes over-engineering. The system sharpens through consistent
repetition and execution. If a process or tool does not actively add value, remove it.

## Agent runtimes (shared)

All coding agents use the same wiki + queue. Runtime-specific lanes live in `config/agents.json`.

| Runtime | Claim as | Entrypoint |
|---|---|---|
| **Cursor** | `--agent cursor` | `.cursor/rules/00-fleet-team.mdc` |
| **Claude Code** | `--agent claude` | `.claude/CLAUDE.md` |
| **OpenCode** | `--agent opencode` | `opencode.json` → `instructions` |
| **OpenCode research** | `--agent opencode` + `-a research` | `.opencode/agents/research.md` |

Shared boot: [SESSION_BOOT.md](./SESSION_BOOT.md)

```powershell
# Cursor: auto via session hook
# Claude: read SESSION_BOOT + .claude/CLAUDE.md
# OpenCode execution loop:
.\scripts\opencode-loop.ps1 -Goal "SITE-003 museum page" -Agent opencode -FixUntilGreen -TestCmd "..."

# OpenCode research delegate (AR-* autoresearch):
.\scripts\opencode-loop.ps1 `
  -Goal "Run AR-306 depth-2 GELU delegate per autoresearch-delegate.md" `
  -OpenCodeAgent research `
  -FixUntilGreen `
  -TestCmd "uv run python scripts/autoresearch_run.py opencode"
```

## 1. Base — architecture & tooling

| Layer | Location | Notes |
|---|---|---|
| Raw ingest | `docs/raw/` | Dumps, API responses, unstructured reference |
| Wiki | `docs/wiki/` | Indexed docs, ADRs, finalized guidelines |
| Knowledge bundle | `knowledge/` | OKF v0.1 — platform concepts, dataset cards, living SME reviews |
| Data collection | `packages/datalab` | `python -m datalab collect` → `data/datalab/` + OKF dataset card |
| Run tracking | `packages/runboard` | `python -m runboard {demo,list,serve}` → `data/runs/` |
| Training console | `apps/sites/observatory` | Port 3006 — live run telemetry (`/v1/runs` on core-api or `runboard serve` :8100) |
| Agent teams | `packages/agentkit` | `python -m agentkit run {data-harvesting,rnd,operations}` — Spec 0014; reports → `knowledge/teams/` |
| Commerce backend | `services/commerce` | Medusa v2 on :9000; local PG at `data/pg-commerce` :5434 (`pg_ctl start -D data/pg-commerce`) |
| Agent registry | `config/agents.json` | Lanes, session paths, task prefixes |
| Utility scripts | `scripts/*.py` | Pure Python; FastAPI only when webhooks are required |
| Task queue | `config/work_queue.json` | Fleet work intake via `pick_task.py` |

## 2. Upload — historical context

Run once per machine or after major doc migrations:

```powershell
pnpm build:upload
```

Copies design exports (`docs/sources/`), schema snapshots into `docs/raw/` with a manifest.
Goal baselines live in [GOALS.md](./GOALS.md).

## 3. Inflow — automated pipelines

```powershell
pnpm build:inflow              # arXiv radar -> docs/raw/arxiv/
pnpm build:inflow-sessions     # Cursor + Claude + OpenCode logs -> docs/raw/sessions/
pnpm build:reflect             # raw -> wiki/DIGEST.md
```

Per-agent session ingest:

```powershell
uv run python scripts/build_sync.py inflow-sessions --agent claude --limit 10
uv run python scripts/build_sync.py inflow-sessions --agent opencode --limit 10
```

## 4. Loop — triaged improvement

See [IMPROVEMENT_LOOP.md](./IMPROVEMENT_LOOP.md). Route all structural changes through
buckets 1–3; do not attempt full automation for system modifications.

| Runtime | Bucket policy |
|---|---|
| **Claude** | bucket-3 for `autoresearch_train.py`; classify before merge |
| **OpenCode** | bucket-1 default; bucket-2 only with `-FixUntilGreen -TestCmd` |
| **Cursor** | classify high-stakes paths; human sign-off for bucket-2/3 |

```powershell
uv run python scripts/build_sync.py classify --path path/to/change
```

## 5. Drive — execution mindset

- Run code; read stack traces and outputs before theorizing.
- Audit wiki and scripts quarterly — delete pipelines that cost more maintenance than they save.
- Claim fleet tasks with your runtime id: `pick_task.py claim <ID> --agent <cursor|claude|opencode>`

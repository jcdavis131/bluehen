# Improvement loop — triage buckets

Route **all** system improvements, code generations, and structural changes through these
buckets. Do not attempt full automation for modifications.

## Bucket 1 — Auto-approve (low risk)

Agent may proceed without human sign-off.

- Typo fixes
- Standard Python linting / formatting
- Basic SQL syntax corrections
- Obvious documentation updates in `docs/wiki/` or comments
- Regenerating `TASKS.md` via `pick_task.py render`

**OpenCode unattended:** safe default — use `-Agent opencode` in `opencode-loop.ps1`.

## Bucket 2 — Sign-off required (high stakes)

Pause and get maintainer approval before merging.

- FastAPI routing changes (`services/core-api/`)
- Database schema migrations (Alembic)
- Prompt engineering adjustments (Eve `instructions.md`, subagent prompts)
- New utility scripts in `scripts/` that touch production paths
- New fleet sites or `config/fleet.json` domain changes
- Eval gate threshold changes

**OpenCode:** allowed only with `-FixUntilGreen -TestCmd "..."` so the loop self-verifies.
Production hosting (`vercel deploy`, `prod-deploy.mjs`, Railway) is **denied** in `opencode.json`
— Operator / Cursor `INF-*` only ([`docs/opencode/GUARDRAILS.md`](../opencode/GUARDRAILS.md)).

## Bucket 3 — Context required (human input)

Requires subjective evaluation or architectural judgment.

- Architectural shifts (new services, ADR-level decisions)
- Model initialization strategies
- MoE routing changes (Phase B / finance-lab)
- ML recipe changes without `EVIDENCE.md` row
- Anything where output quality must be judged by a human

**Claude lane:** `scripts/autoresearch_train.py` architecture edits are always bucket-3.

## Classifier

```powershell
uv run python scripts/build_sync.py classify --path services/core-api/app/routes/search.py
uv run python scripts/build_sync.py classify --path docs/wiki/BUILD.md
```

Output: `bucket-1`, `bucket-2`, or `bucket-3` with reason.

## Fleet integration

Work queue tasks in `config/work_queue.json` are pre-scoped. Claim before coding:

```powershell
uv run python scripts/pick_task.py claim SITE-001 --agent cursor
uv run python scripts/pick_task.py claim AR-306 --agent claude
uv run python scripts/pick_task.py claim SITE-003 --agent opencode
```

Registry and session ingest paths: `config/agents.json`

## Runtime cheat sheet

| Runtime | When to use | Bucket default |
|---|---|---|
| **Cursor** | Interactive UI, infra, multi-file refactors | classify per path |
| **Claude Code** | ML architecture, autoresearch delegate queue | bucket-3 for train.py |
| **OpenCode loop** | Unattended bucket-1 fixes with test gate | bucket-1 |

OpenCode loops: [`docs/OPENCODE_LOOP.md`](../OPENCODE_LOOP.md)

**Execution (bucket-1):**
```powershell
.\scripts\opencode-loop.ps1 `
  -Goal "Implement SITE-003 dumbmodel museum page per spec 0007" `
  -WorkDir C:\Users\jcdav\bluehenre `
  -Agent opencode `
  -FixUntilGreen `
  -TestCmd "pnpm --filter @synthaembed/dumbmodel build"
```

**Research delegate (bucket-3, one hypothesis):**
```powershell
.\scripts\opencode-loop.ps1 `
  -Goal "Apply AR-306 depth-2 GELU hypothesis - one change in autoresearch_train.py" `
  -OpenCodeAgent research `
  -FixUntilGreen `
  -TestCmd "uv run python scripts/autoresearch_run.py opencode"
```

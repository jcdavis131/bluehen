# Raw ingest (`docs/raw/`)

Unformatted dumps land here. **Do not edit by hand for long-lived truth** — promote
synthesized takeaways to [`../wiki/`](../wiki/) via `pnpm build:reflect`.

## Layout

| Path | Source | Format |
|---|---|---|
| `arxiv/` | `pnpm literature:radar` / `build_sync inflow-arxiv` | JSON + markdown digests |
| `sessions/cursor/` | Cursor agent transcripts | `.jsonl` copies |
| `sessions/claude/` | Claude Code session logs | `.jsonl` copies |
| `sessions/opencode/` | OpenCode loop turn logs | `.txt` copies |
| `exports/` | Google Doc exports, API responses | markdown, JSON |
| `exports/sources/` | Legacy `docs/sources/*.md` mirrored by `build_sync upload` | timestamped markdown |
| `schemas/` | SQL dumps, OpenAPI snapshots | `.sql`, `.json` |
| `reflections/` | `build_sync reflect` summaries | `YYYYMMDD-HHMMSS-summary.json` |
| `manifest.json` | Upload + inflow ledger maintained by `build_sync` | JSON |

> Legacy `docs/sources/` is not mirrored under `raw/sources/`; `build_sync upload`
> copies it into `exports/sources/` (see `scripts/build_sync.py`).

## Rules

1. **Timestamp filenames** — `YYYYMMDD-HHMMSS-<slug>.<ext>` when the upstream has no stable id.
2. **No secrets** — scrub API keys before saving; use `.env.example` patterns in wiki instead.
3. **Retention** — raw is ephemeral; delete or archive when reflection is done and wiki is updated.

Sync: `uv run python scripts/build_sync.py upload|inflow-arxiv|inflow-sessions|reflect`

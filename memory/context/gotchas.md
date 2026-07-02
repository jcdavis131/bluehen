# Gotchas — reusable rules from past sessions

> Rule-first, then evidence. One fact per entry. Date if time-sensitive.
> Source: `~/.cursor/skills/` (fable-watch) · `scripts/build_experiment_index.py`

## Validate-gate skip rule (2026-07-02)

When a diff touches **no TypeScript surface** (only Python + JSON *values*, with the JSON *shape* unchanged and the consuming `.tsx` untouched), the `pnpm typecheck` gate is non-blocking — the page can't fail to compile against a shape it already compiles against. State the skip and the reason; don't sink minutes into a disk-bound install for a gate that can't fail.

Evidence: SITE-001 touched only `scripts/build_experiment_index.py` + `apps/sites/hub/data/experiments.json` *values*; the `/research` page was unchanged. A `pnpm install + typecheck` ran ~4.5min silent on BLK-DISK before being killed by PID — the skip was correct.

## Disk-bound installs hang silently on BLK-DISK (2026-07-02)

On this box when BLK-DISK is active, `pnpm install --prefer-offline` can go silent for 4+ minutes with no output (output buffered by `Select-Object -Last N` until completion). Track the PID at launch; if silence exceeds ~90s, kill by PID (`Stop-Process -Id <pid> -Force`) and either skip the gate (if non-blocking) or restart with `--reporter=append-only 2>&1 | Select-Object -Last 15`. Never `Stop-Process -Name node -Force` — collateral damage.

## Markdown section anchors must be respected when parsing counts (2026-07-02)

A naive "scan the whole file for the largest N" parser leaks counts across sections. `EVIDENCE.md#3.6` must scan only §3.6's body, not the whole file — otherwise `family-c-realtext` picks up `891` from an unrelated §3.8 campaign instead of its own `48`. Slice the markdown to the anchored header (match `^#{1,6}\s+<anchor>`, end at the next same/shallower header) before regexing. If the slice has no match, fall back to a curated `runs_hint` rather than scanning the whole file.

## Fable-watch skills (25) live in ~/.cursor/skills/ (2026-07-02)

Cursor reaches parity with Fable 5 (Claude) via 25 skills codified from terminal observation: `session-orient`, `shell-confirm-hygiene`, `sme-fanout`, `smoke-import`, `progress-board`, `dependency-hygiene`, `affected-tests`, `cost-transparency`, `auto-mode`, `match-conventions`, `follow-procedure`, `validate-gate`, `background-failure-triage`, `lane-discipline`, `fill-the-wait`, `verify-subagent-output`, `silent-op-recovery`, `persist-learnings`, `recap-on-long-session`, `event-driven-wait`, `use-design-system`, `readiness-report`, `document-non-action`, `pre-commit-hygiene`, `abstract-the-provider`. Index: `.cursor/fable-watch/skills-built.md`. Patterns log: `.cursor/fable-watch/observed-patterns.md`. Skills loaded into a session's available-skills list are snapshotted at session start — skills created mid-session by the fable-watch loop exist on disk but need a session restart to auto-load.

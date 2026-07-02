# Eve

**Also known as:** Eve, Fleet Director, Chief of Staff  
**Role:** Synthetic organization fleet agent  
**App:** `apps/synthorg`  
**Team:** Platform Orchestration

## Communication

- Operates via synth-core tools and CLI
- Delegates to division-aligned subagents (in progress)
- Traces should map session → `SYNTH_TRACE_ID` (not wired yet)

## Context

- Runs lifecycle runs (`hill-climb`) across fleet workspaces
- Reads Operations Ledger for stuck stages and weak feedback
- Respects per-workspace cost budgets (`RESEARCH_COST_CEILING_USD_PER_DAY`)
- Does not bypass core-api — Spec 0006

## Related people

- **Operator** — human override and charter approval
- **Cursor / Claude** — implementation and research agents Eve coordinates with

## Notes

- Subagents need `description` fields (Eve framework requirement) — open task P1

# README — Deep Memory

Two-tier memory for Blue Hen RE. Agents decode shorthand like a colleague.

## Lookup flow

```
User request
  → CLAUDE.md (hot cache, ~90% of daily terms)
  → memory/glossary.md (full decoder ring)
  → memory/people/ | memory/projects/ | memory/context/
  → Ask Operator if unknown → add to glossary + promote if frequent
```

## Structure

| Path | Purpose |
|------|---------|
| `../CLAUDE.md` | Hot cache — top people, terms, active projects |
| `glossary.md` | Complete acronyms, nicknames, codenames |
| `people/` | Agent and operator profiles |
| `projects/` | Circuit stops and platform projects |
| `context/company.md` | Tools, teams, processes, phases |

## Conventions

- Filenames: lowercase, hyphens (`operator.md`, `slasso.md`)
- **Bold** in CLAUDE.md for scannability
- Promote frequent terms to CLAUDE.md; demote stale ones to glossary only
- Never store secret values (API keys live in gitignored `data/workspaces/`)

## Related (not productivity memory)

| File | Purpose |
|------|---------|
| `.claude/CLAUDE.md` | SDD coding guardrails |
| `HANDOFF.md` | Code session paste context |
| `TASKS.md` | Productivity task list |
| `dashboard.html` | Visual task board |

Initialize or refresh: `/productivity:start` · Sync: `/productivity:update`

# Wiki index

Human-readable, indexed documentation. Agents read **wiki first**, then specs and code.

## Framework

| Page | Purpose |
|---|---|
| [SESSION_BOOT.md](./SESSION_BOOT.md) | **Shared init** — Cursor, Claude, OpenCode |
| [BUILD.md](./BUILD.md) | B.U.I.L.D. system setup rules |
| [GOALS.md](./GOALS.md) | Mission + deliverable baselines (evaluate actions against these) |
| [IMPROVEMENT_LOOP.md](./IMPROVEMENT_LOOP.md) | Triaged change buckets (auto / sign-off / human) |
| [LOCAL_DEV.md](./LOCAL_DEV.md) | Windows + fleet ports + `fleet-review.ps1` |
| [TECH_DEBT.md](./TECH_DEBT.md) | Prioritized backlog (Impact/Risk/Effort) |
| [ARCHITECTURE_REVIEW.md](./ARCHITECTURE_REVIEW.md) | Structural review index (2026-06-29) |

## Architecture & decisions

| Page | Purpose |
|---|---|
| [../adr/README.md](../adr/README.md) | Architecture decision records |
| [../SOURCE_MAP.md](../SOURCE_MAP.md) | Google Docs ↔ repo ↔ specs traceability |
| [../FRONTIER_ARCHITECTURE.md](../FRONTIER_ARCHITECTURE.md) | Research synthesis |
| [../EXECUTIVE_ROADMAP.md](../EXECUTIVE_ROADMAP.md) | Phase A priorities |

## Operations

| Page | Purpose |
|---|---|
| [../AGENT_INIT.md](../AGENT_INIT.md) | Agent onboarding sequence |
| [../OPENCODE_LOOP.md](../OPENCODE_LOOP.md) | Unattended OpenCode multi-turn loop |
| [../../infra/railway.md](../../infra/railway.md) | Production deploy runbook |

## Normative (repo root — not duplicated here)

- `HANDOFF.md` — paste-ready mission context
- `EVIDENCE.md` — measured results ledger
- `SCIENCE_REVIEW.md` — integrity audit
- `specs/README.md` — acceptance criteria matrix

## Digests (generated)

| Page | Source |
|---|---|
| [DIGEST.md](./DIGEST.md) | `pnpm build:reflect` — recent raw → wiki summary |

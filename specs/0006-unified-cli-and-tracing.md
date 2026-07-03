# 0006 — Unified Access Layer, CLI & Tracing

- **Status:** Partial
- **Owner:** Platform
- **Related specs:** 0002, 0004, 0005, 0007, 0012
- **ADR:** [003-unified-org-cli](../docs/adr/003-unified-org-cli.md) (Accepted)
- **Implementation:** `packages/synth-core`, `packages/cli`, Eve tools via `agent/lib/synth.ts`

## Problem

Agents, humans, CI, and sites must reach services through one client so every action is traced
and no bypass paths exist.

## Goals

- **One way in:** `synth-core` → `core-api` only.
- **Full traceability:** one trace id per objective; spans with actor + target.
- **CLI parity:** `synth` commands mirror SDK methods.

## Design

### `packages/synth-core`

- `Synth` client with namespaces: `data`, `train`, `evals`, `model`, `vector`, `ledger`, `trace`, `research`.
- `withSpan` + `setTraceSink` → POST `/v1/trace`.
- Headers: `x-synth-trace-id`, `x-synth-span-id`, `x-synth-parent-span`, `x-synth-actor`.

### `packages/cli`

- `synth fleet list|context`, ledger, train, eval, etc.
- **Org scope:** `--org <siteId>` or `SYNTH_ORG`; credentials from `data/workspaces/{siteId}.env`.
- `synth org list|divisions|env|handoff` — division handoffs via ledger (Spec 0012).
- `synth research hill-climb` — lifecycle run.
- Same calls as Eve agent tools.

### Eve agent (`apps/synthorg`)

- All tools import `synthFor()` from `agent/lib/synth.ts`.
- Model config in `agent/agent.ts` (AI SDK v4 via Eve 0.16.2).
- **Wired:** Eve session id → trace context. Every tool's `execute(input, ctx)` receives
  `ctx.session.id` (Eve `SessionContext`); `synthFor(actor, ctx.session)` roots a synth-core
  `TraceContext` on it (`agent/lib/trace.ts`). Delegated subagent sessions carry
  `parent.rootSessionId` + `parent.callId`, so the whole chief → subagent chain shares one
  objective trace id and each delegation is a child span. `agent/instrumentation.ts` stamps
  the same trace id onto AI SDK model-call telemetry (`step.started`).
- **Done:** declared subagents have `agent/subagents/*/agent.ts` with `description` (all four).

### Agent runtimes (multi-agent)

| Runtime | Config | Boot |
|---|---|---|
| Cursor | `.cursor/rules/`, `AGENTS.md` | `docs/wiki/SESSION_BOOT.md` |
| Claude Code | `CLAUDE.md`, `.claude/CLAUDE.md` | same + `pnpm build:context --agent claude` |
| OpenCode | `opencode.json`, `docs/OPENCODE_LOOP.md` | same + `scripts/opencode-loop.ps1` |
| Eve | `apps/synthorg` | `synthFor()` + fleet tools |

Registry: `config/agents.json`. Knowledge pipeline: `scripts/build_sync.py` (B.U.I.L.D. —
see `docs/wiki/BUILD.md`).

### Known bypass (debt)

- **`packages/ui-fleet/src/site-api.ts`** calls core-api via raw `fetch`, not `synth-core`.
  Violates "one way in"; no trace headers. Tracked in `docs/wiki/TECH_DEBT.md`.

## Contract (CLI ↔ SDK ↔ API)

| SDK / CLI | API |
|---|---|
| `data.ingest` | `POST /v1/data/ingest` |
| `train.launch` | `POST /v1/train/launch` |
| `evals.run` / `gates` | `POST /v1/eval/run`, `GET /v1/eval/{v}/gates` |
| `model.deploy` / `list` | `POST /v1/model/deploy`, `GET /v1/models` |
| `vector.embed` / `search` | `POST /v1/embed`, `POST /v1/search` |
| `research.hillClimb` | `POST /v1/research/hill-climb` |
| `ledger.record` / tail | `POST/GET /v1/ledger` |
| `trace.view` | `GET /v1/trace/{id}` |

## Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | No agent tool calls services except via synth-core | ✅ tools use `synthFor` |
| 2 | Every call produces a span at `/v1/trace` | ✅ tool calls emit session-rooted spans via `synthFor(actor, ctx.session)`; model calls stamped via `instrumentation.ts` (non-`synthFor` paths like the `ui-fleet/site-api.ts` bypass still don't — see debt) |
| 3 | `synth trace view` reconstructs objective | ✅ API exists |
| 4 | Trace id flows TS → core-api → worker | ✅ TS tools root on Eve session id → `synth-core` → `x-synth-trace-id` header → core-api (objective-scoped); core-api → Modal worker propagation still partial |
| 5 | Lint forbids direct fetch/db in `agent/**` outside synth-core | ⏳ not in CI |
| 6 | `--org` resolves workspace creds from `data/workspaces/{siteId}.env` | ✅ ADR-003 |
| 7 | `synth org handoff` records division handoffs to ledger | ✅ Spec 0012 |

## Test plan

- Unit: header round-trip in `packages/synth-core` (TBD).
- Integration: CLI hill-climb + worker + trace replay (manual today).

## Risks

- Bypass paths break auditability → add ESLint rule or `review` script check.

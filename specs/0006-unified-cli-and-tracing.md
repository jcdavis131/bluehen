# 0006 — Unified Access Layer, CLI & Tracing

- **Status:** Draft
- **Related specs:** 0002, 0004, 0005

## Problem
A multi-agent synthetic organization (Chief of Staff + four worker subagents) plus humans and
CI all touch the same services and databases. Without one uniform interface, every agent
reinvents access, and inter-agent conversations/handoffs become impossible to trace.

## Goals
- **One way in.** Every actor (agent, `synth` CLI, CI, dashboard) reaches every service/db
  through a single client + a single API chokepoint.
- **Full traceability.** Every objective is one trace; every action is a span with actor,
  target, status, and timing; handoffs between agents are visible in one replayable timeline.

## Design
- **`packages/synth-core`** — the uniform TypeScript SDK (`Synth`) with lifecycle namespaces
  (`data`, `train`, `evals`, `model`, `vector`, `ledger`, `trace`). `withSpan` wraps every
  call; `setTraceSink` ships spans back through the same endpoint.
- **`packages/cli`** — `synth`, a thin command surface over `synth-core`. Humans/CI run the
  *same* calls agents make, so a CLI action and an agent action are indistinguishable in the
  trace store.
- **core-api (`services/core-api`)** — the single network chokepoint. All routes accept the
  trace headers and (for tenant routes) a workspace key; it proxies to Neon and Modal.
- **Trace propagation contract (cross-language).** Headers:
  `x-synth-trace-id`, `x-synth-span-id`, `x-synth-parent-span`, `x-synth-actor`.
  TS (`synth-core/trace.ts`) and Python (`services/trainer/trace.py`) implement the same
  contract, so a TS agent → core-api → Modal Python function all share one trace.
- **Agent tools** import `synth-core` (`agent/lib/synth.ts`) — they never call services
  directly, guaranteeing uniformity and tracing by construction.

## Contract (CLI ↔ SDK ↔ API)
`synth data ingest|chunk|pairs` · `synth train launch|status` · `synth eval run|gates` ·
`synth model deploy|list` · `synth embed` · `synth search` · `synth ledger tail` ·
`synth budget` · `synth trace view <id>` → map 1:1 to `Synth` methods → map 1:1 to `/v1/*`.

## Acceptance criteria
1. No agent tool or app makes a service/db call except through `synth-core`.
2. Every call produces a span recorded at `/v1/trace`, tagged with actor + target.
3. `synth trace view <traceId>` reconstructs a full objective including cross-agent handoffs
   and the Modal/Python spans under it.
4. The same trace id flows TS → core-api → Python and back.

## Test plan
- `synth-core`: unit tests for header round-trip (`toHeaders`/`fromHeaders`) and `withSpan`
  success/error recording.
- Integration: run an objective through the CLI against a local core-api; assert a single
  trace contains spans from `cli` + each subagent + `trainer.*`.

## Risks
- A bypass path (an agent calling a service directly) breaks traceability → lint rule / review
  gate forbidding direct `fetch`/db imports in `agent/**` and `apps/**` outside `synth-core`.

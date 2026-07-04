# Dynamic workflow orchestration — end to end

> Lead: Claude (orchestrator loop). Sub-agents: GLM 5.2 teams
> (`packages/agentkit`, Spec 0014). IDE lanes: Cursor, OpenCode.
> Board: [STATUS.md](./STATUS.md) · Queue: [TASKS.md](../TASKS.md)
> **Activation gate: `GLM_API_KEY`** — until set, sub-agents execute
> deterministic duties only; every plan below is wired and waiting.

## The loop, end to end (production path — LIVE)

```
sources (registry) ──datalab watch──▶ datasets (OKF cards)
      ▲                                    │ corpora (baked /app/corpora)
      │ consented user data                ▼
  ventures (7 sites) ◀──serve/index── worker: train ─▶ eval gates ─▶ BD queue
      │                                    │ (runboard telemetry)      │
      ▼                                    ▼                           ▼
   leads/orders                       Observatory              charter ─▶ deploy
```

Every arrow above is deployed and exercised; the orchestrator's job is
keeping arrows healthy and routing work to the cheapest capable agent.

## Orchestrator (Claude lead-dev loop) — standing plan (v2, 2026-07-04)

- **Cadence:** tight — heartbeat ≤ 20 min; event monitors are always the
  primary wake signal. Never stretch past 30 min while the Operator is
  active.
- **Each iteration runs three phases:**
  1. **SENSE** — monitors, gates, queue, prod pulse. Cheap and local.
  2. **EXECUTE** — claim and build. Parallelizable, well-specified work
     is DELEGATED to smaller-model subagents (haiku for verification/
     sweeps/report generation, sonnet for scoped implementation) with
     precise, self-contained instructions; the orchestrator integrates
     results and owns every commit. One orchestrator-sized task max per
     tick; everything else fans out.
  3. **CLOSE (mandatory)** — (a) REVIEW: verify what shipped (tests,
     live checks — delegable); (b) HANDOFF: refresh STATUS.md/HANDOFF.md
     and queue notes so any session can resume cold; (c) SLATE: groom
     the next 1–3 tasks with per-task guidance written into
     config/work_queue.json notes — acceptance criteria, files, lane —
     so smaller agents can execute them without re-derivation.
- **Deploy discipline:** batch Railway deploys; never restart mid-train
  without cause.
- **Escalation to Operator:** prod data mutations, spend, auth/domain
  changes, anything spec-gated.

## Sub-agent detailed plans (GLM 5.2 — executable charters)

The full stepwise playbooks live IN the team charters
(`packages/agentkit/agentkit/teams.py`) so they are versioned and
literally what the model executes. Summary of each:

### 1 · data-harvesting (data division, cadence 6h)
Deterministic: watch-tick over due sources; dataset inventory.
GLM plan: audit registry coverage vs venture needs → score gaps →
add at most 2 additive sources per run (https-only; deny-listed globs
blocked in code) → verify tick materializes → report deltas to OKF.
DoD: every venture with a consented data path has ≥1 registry source
and fresh cards. Escalate: fetch failures 3 runs straight.

### 2 · rnd (research division, cadence 12h)
Deterministic: research-queue snapshot; run-telemetry/collapse review.
GLM plan: rank open AR-/RAG- items by evidence value per compute-hour →
match each to the delegate lane contract (`.claude/autoresearch-delegate.md`)
→ flag any prod run with collapse alerts or gate failures with a written
hypothesis → propose (never merge) recipe changes as queue items with
eval gates attached. DoD: top-3 next experiments always current with
rationale. Escalate: gate regression on a deployed model.

### 3 · operations (orchestration division, cadence 24h)
Deterministic: blockers report; datalab/runboard health.
GLM plan: verify the whole arrow diagram — sites 200, /readyz ready,
worker heartbeat fresh, latest dataset age, leads flowing → reap stale
queue claims (>48h) → write the Operator digest (blockers ranked, one
unblock action each, spend vs ceiling). DoD: digest current in
knowledge/teams/operations.md. Escalate: any LIVE surface down.

## IDE lanes (human-paired)

- **cursor:** REV-904 (in flight — Lead model/migration/BFF landed),
  SITE-00x pages, OMNI-004. Contract: specs + queue lanes; converges via
  git (three parallel merges today, zero collisions).
- **opencode:** RAG-502/505 scripted, bucket-1 only
  (`opencode-loop.ps1 -FixUntilGreen`).

## Operator gates (the only blockers that need you)

1. `GLM_API_KEY` → sub-agents go full-mode (set in local env + Railway).
2. Spec 0016 sign-off (dumbmodel game layer) + consent copy reviews.
3. Certification price (Medusa Admin) · Stripe key when commerce goes live.

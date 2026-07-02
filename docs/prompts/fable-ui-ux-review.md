# Prompt — Fable UI/UX Engagement Review

> Hand this prompt to Claude Fable (terminal 1). It reviews the UI/UX of every fleet site, then ships an engagement + gamification pass focused on the user-facing hub.

---

## Role

You are a **Product UX Strategist + Frontend Engineer**. You audit the Blue Hen RE site fleet for *engagement*, then design and implement a gamified, interactive refresh — heaviest on the public-facing hub. You pair-program with Cursor (me) under the fleet rules in `AGENTS.md` and `.cursor/rules/00-fleet-team.mdc`.

## Fleet context (read first, do not skim)

- Registry: `config/fleet.json` — source of truth for site id, domain, role, appPath, phase.
- Sites live in `apps/sites/<id>/` (Next.js App Router). Shared chrome comes from `@synthaembed/ui-fleet` and `@synthaembed/fleet` — **reuse their primitives**, do not fork a new design system.
- The public/user-facing site is **`hub`** at `bhenre.com` (`apps/sites/hub`). It is the primary target.
- Supporting sites to review for cross-site consistency (lighter touch): `dumbmodel` (dumbmodel.com), `benchmark-lab` (slasso.com), `research-rag` (arxiviq.com), `finance-lab`, `training-console`, `control` (jcamd.com).
- Voice: **Enterprise B2B, measured, evidence-backed** — no sports metaphors in product UI copy. Gamification must feel *earned and professional*, not arcade-y or childish. Think Linear × Stripe × a research dashboard, not Duolingo.
- Guardrails: v1 = simulation only, no live trading. ML claims need `EVIDENCE.md`/`SCIENCE_REVIEW.md` backing. Never bypass `core-api` via direct Postgres — site routes go through `@synthaembed/synth-core`/BFF.

## Existing in-repo patterns to extend (not reinvent)

- Mascots + meter: `apps/sites/dumbmodel/components/site-mascots.tsx` (`ConeMascot`, `HenMascot`, `DumbnessMeter`) — a restrained, on-brand example of personality + a progress meter.
- Hall of Cone: `apps/sites/dumbmodel/components/HallOfCone.tsx` — leaderboard-style surface; a gamification precedent.
- Live search: `@synthaembed/ui-fleet` `LiveSearchPanel` (used on `hub/app/try/page.tsx`) — interactive surface already present.
- Closed-loop diagram: `ClosedLoopDiagram` (hub home) — the operating loop is the natural spine for "progress" gamification.
- Hub data sources already wired: `/healthz`, `/v1/budget`, `/v1/ledger`, `/v1/models`.

## Phase 1 — Audit (no code yet)

For **each site**, produce a short audit card:

1. **First impression** (above-the-fold, 5s test): what does a first-time visitor understand? What's missing?
2. **Engagement gap**: where does the page feel static, passive, or report-like?
3. **Interactivity inventory**: which elements are interactive vs. read-only? Where would a user *want* to act and can't?
4. **Gamification opportunity**: progress, streaks, milestones, "race" framing (the platform already speaks in terms of a *race log* / *operating loop* / *hill-climb* — lean into that vocabulary, not generic points/badges).
5. **Consistency note**: does it match the hub's chrome and the `ui-fleet` tokens?

Rank the fleet by engagement-priority. Hub should land #1. Output the audit as `docs/reviews/ui-ux-engagement-audit.md`.

## Phase 2 — Hub engagement + gamification design

Before writing JSX, propose a concrete design for **hub (`bhenre.com`)** covering:

- **Operating Loop as a live game board**: `ClosedLoopDiagram` becomes an *interactive* circuit — hover/click a stage to see its latest ledger entry, owner, and time-since-last-advance. Stages that haven't advanced in N hours show a "stalled" state; a freshly advanced stage pulses.
- **Race Log → Race Feed**: the `GLOSSARY.raceLog` list becomes a live, animated, append-as-it-arrives feed (SSE/poll) with stage icons, deltas, and a "you are here" marker on the loop.
- **Progress meters that mean something**: model effective-rank and nDCG as a *measured* progress bar toward the deploy gate (Spec 0008), not decoration. Budget remaining as a burn-down. Use the `DumbnessMeter` pattern generalized into `ui-fleet` as `<ProgressMeter>` (label, value, ceiling, tone).
- **Milestones / "firsts"**: first deployed model, first hill-climb completed, first BD promotion — surface as a quiet, professional milestone strip (not confetti).
- **Interactive product surface**: `/try` becomes a *guided* live search — sample queries as one-click chips, "compare two queries" mode, result-quality explainer tying back to effective rank. Keep `LiveSearchPanel` as the engine; add the guided layer around it.
- **Personality, restrained**: a single `HenMascot` moment (e.g., the badge state on the home StatCard) — state-reactive (hen "looks" toward the active stage). No more than one mascot beat per page.
- **Micro-interactions**: card hover lift, number count-up on stat cards (intersection-observed, `prefers-reduced-motion` aware), keyboard-shortcut palette (⌘K) across the hub.

State which of these are **new `ui-fleet` primitives** (shared) vs. hub-local components. Prefer shared so other sites inherit the lift.

## Phase 3 — Implement (claim a SITE- task first)

1. `uv run python scripts/pick_task.py list` — find or create a `SITE-HUB-ENGAGE` task (and child tasks per primitive). **Claim before coding.**
2. Build shared primitives in `packages/ui-fleet` first: `ProgressMeter`, `InteractiveCircuit` (wrapper around `ClosedLoopDiagram`), `RaceFeed`, `MilestoneStrip`, `CommandPalette`. Keep tokens/conventions from `use-design-system`.
3. Wire hub pages to use them. Pull live data from the existing BFF routes; if a route is missing (e.g., SSE for ledger), add a thin `core-api` endpoint — do not poll the DB from the site.
4. Keep diffs minimal and match surrounding conventions (`match-conventions`). No new design tokens; extend `ui-fleet` tokens if needed.
5. Lighter passes on `dumbmodel`, `benchmark-lab`, `research-rag` for consistency — adopt the shared primitives, don't fork.

## Phase 4 — Verify & hand off

- `pnpm --filter @synthaembed/hub build` and `pnpm review` must pass.
- Smoke-check interactivity with the browser (CDP/snapshot) — confirm count-up, hover states, ⌘K palette, and the interactive circuit all work and respect `prefers-reduced-motion`.
- Update `docs/reviews/ui-ux-engagement-audit.md` with before/after notes.
- `uv run python scripts/pick_task.py done <ID>` then `pick_task.py render`.
- Readiness report per `readiness-report` skill: what shipped, what's staged, what needs Operator sign-off.

## Hard constraints

- No emoji in product UI unless the Operator approves.
- No fake metrics — every number on screen must trace to a real `core-api` field. If it doesn't exist, omit it (don't fabricate).
- Accessibility: keyboard reachable, focus visible, `prefers-reduced-motion` honored, color contrast ≥ AA.
- No live trading UI; `finance-lab` stays simulation-framed.
- Do not edit `autoresearch_train.py` or Eve's lane (`apps/synthorg`). UI/UX only.

## Deliverables

1. `docs/reviews/ui-ux-engagement-audit.md` — fleet audit + hub design.
2. Shared primitives in `packages/ui-fleet`.
3. Refreshed `apps/sites/hub` (and lighter passes on 2–3 sibling sites).
4. Passing `pnpm review`, claimed/done SITE-* tasks, readiness report.

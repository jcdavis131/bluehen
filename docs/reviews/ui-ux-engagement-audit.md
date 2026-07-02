# Fleet UI/UX engagement audit + hub gamification design

> SITE-004 · 2026-07-02 · Product UX Strategist pass (Claude, pair rules:
> AGENTS.md + .cursor/rules/00-fleet-team.mdc) · Voice: enterprise B2B,
> evidence-backed. Gamification vocabulary = the platform's own (operating
> loop, race log, hill-climb, deploy gate) — no generic points/badges.

## Phase 1 — Audit

### Ranking by engagement priority

| # | Site | 5-second read | Engagement grade | Core gap |
|---|------|---------------|------------------|----------|
| 1 | **hub** (bhenre.com) | "Platform console" — live stats + loop diagram | C+ | Everything renders once server-side then sits still; the loop diagram is informational, not interactive; race log is a plain list |
| 2 | **dumbmodel** | Cone-vs-Hen comparison — instantly legible | B | Highest personality, but leaderboard + baseline column run on static fixtures; meter is local, not shared |
| 3 | **benchmark-lab** | "Certified benchmarks" — authoritative, static | C | Homepage is 100% fixture data next to a working LiveSearchPanel one route away |
| 4 | **research-rag** | Live RAG demo w/ tier compare — strongest interactive demo | B− | `/research-lab` registry page is a hand-rolled static page ignoring the `bh-stage-*` system built for it |
| 5 | **finance-lab** | "Simulation lab" that is actually CLI docs | D | Largest capability-to-UI gap: `/v1/omni/simulate` exists; the site renders copy-paste commands |
| 6 | **training-console** | Live W&B-style observatory | A− (engagement) / D (consistency) | Genuinely live, but a fully parallel class system inside FleetShell |
| 7 | **control** | Operator command center, live admin data | B | Fine for operators; product-surface cards are static metadata |

### Hub — detailed findings (primary target)

**First impression (5s):** name, tagline, one status badge, four stat
cards. A visitor cannot tell the platform is *alive* — nothing moves,
nothing invites a click besides three inline links.

**Interactivity inventory:** zero client components on the homepage.
`/try` has LiveSearchPanel (good engine, single-query only). Data is
fetched server-side once (`/healthz`, `/v1/budget`, `/v1/ledger`,
`/v1/models`) — the freshest data the fleet has, rendered as static text.

**Engagement gaps:**
1. `ClosedLoopDiagram` names an *operating loop* but only highlights one
   division; no hover/click affordance, no ledger detail, no sense of
   time (when did the loop last advance? is a stage stalled?).
2. Race log (`GLOSSARY.raceLog`) is a `<div>` list — no stage color, no
   deltas (`metricDelta`/`costUsd` are in the payload and dropped), no
   arrival animation, no "you are here."
3. Deployed-model rank/nDCG are shown as bare text with no reference to
   the deploy gate (Spec 0008) — the one number that makes them mean
   something. Budget is text, not a burn-down.
4. No milestones: the ledger contains the platform's "firsts" (first
   deploy, first hill-climb, first charter) and none are surfaced.
5. No keyboard surface (⌘K) across a 7-site fleet.

### Fleet-wide observations

- The gamification vocabulary already exists and is *owned* (relay legs,
  batons, race-log stages, hill-climb, deploy gate) — the job is making
  it live, not inventing new metaphors.
- `ClosedLoopDiagram` — the richest loop artifact — is consumed by hub
  only. Sibling sites don't share the spine.
- Undefined-but-referenced classes (`bh-mono`, `bh-btn--hen`,
  `bh-stat--hen`, `bh-stack`, `bh-link`) mean silent styling gaps in
  dumbmodel/benchmark-lab/finance-lab.
- Legacy `fleet-*` styling persists in dumbmodel `site.tsx`, research-rag
  `/research-lab`, `TierComparePanel`, `ClosedLoopDiagram`.
- training-console is intentionally chart-specialized; do not force
  `bh-*` onto its chart internals, but its chrome (headers/subnav) should
  converge eventually (tracked, out of scope here).

## Phase 2 — Hub design

Principle: **every animated element is driven by a real core-api field**
(ledger `ts`/`stage`/`metricDelta`, models `effectiveRank`/`ndcg10`,
budget `remainingUsd`/`ceilingUsd`). No number is invented; anything
unavailable is omitted, not faked.

| Feature | Behavior | Placement | Shared vs local |
|---|---|---|---|
| **Interactive circuit** | Division nodes become buttons: hover/click → side detail with that division's latest ledger entry, owner, time-since-advance. Stage lit from live ledger. Stalled flag when the loop hasn't advanced in >24h; ≤5-min-old advance pulses (animation suppressed under reduced motion). Polls `/api/ledger` every 20s. | Hub home, replacing static `ClosedLoopDiagram` usage | **Shared** `InteractiveCircuit` (ui-fleet); `ClosedLoopDiagram` retained for static contexts |
| **Race Feed** | Ledger entries append with a slide-in as they arrive (20s poll, count-diffed), stage dot colored by owning division, `metricDelta`/`costUsd` rendered when present, relative timestamps, "latest" marker. | Hub home, replacing the plain race-log list | **Shared** `RaceFeed` |
| **Deploy-gate meters** | `ProgressMeter`: value, max, target tick. Hub: effective rank and nDCG@10 of the deployed model vs the Spec 0008 gate thresholds; budget as burn-down (`lower-better`). Meters render only when the fields exist. | Hub home stat area | **Shared** `ProgressMeter` (generalizes DumbnessMeter) |
| **Milestone strip** | "Firsts" computed from ledger + models: first hill-climb, first eval, first deploy, first BD charter, first index. Quiet row — achieved (date, mono) vs pending (muted). No confetti. | Hub home under stats | **Shared** `MilestoneStrip` |
| **Guided /try** | Keep LiveSearchPanel (chips already exist). Add compare-two-queries mode (two panels side-by-side, shared model badge) and a result-quality explainer card linking retrieval quality → effective rank → the deploy gate, citing the deployed model's real numbers. | Hub `/try` | Compare = **hub-local** composition of the shared panel; explainer local copy |
| **Mascot beat** | HenMascot (moved to ui-fleet with a `gaze` prop) sits in the home PageHeader badge and looks toward the active division's position in the loop. One per page, static SVG otherwise. | Hub home badge | **Shared** mascot component; usage local |
| **Count-up stats** | Stat numbers count up on first scroll into view; intersection-observed; `prefers-reduced-motion` renders final value instantly. | Hub stat cards | **Shared** `CountUpStat` |
| **⌘K palette** | Command palette: fleet sites + hub routes + "Try live search" action. Arrow/Enter/Esc, visible focus ring, `aria` listbox. | Hub layout (fleet-wide capable) | **Shared** `CommandPalette` |
| **Card hover lift** | Existing `.fleet-card` hover deepened slightly (translateY(-1px) + border accent), motion-safe. | components.css | **Shared** CSS |

**Data path:** all client polling goes through existing BFF re-exports
(`GET_ledger`, `GET_models`, `GET_health` in `ui-fleet/routes`) — hub
gains `app/api/ledger/route.ts` (2-line re-export). No SSE endpoint
needed at this polling cadence; revisit if cadence <5s is ever wanted.
No direct DB or core-api access from the browser.

**A11y bar:** all new interactive elements keyboard-reachable with
visible focus (`--bh-border-focus`), `role`/`aria-*` on meter, feed
(`aria-live="polite"`), palette (listbox), circuit (buttons +
`aria-expanded`); every animation gated behind
`@media (prefers-reduced-motion: no-preference)`; text on surface ≥ AA
(token palette already clears it).

### Sibling passes (this iteration)

1. **dumbmodel** — `DumbnessMeter` becomes a thin wrapper over shared
   `ProgressMeter` (keeps its name/API); mascots move to ui-fleet and
   dumbmodel re-exports them (no fork). Defines the missing
   `bh-mono`/`bh-stack` usages by adding those utilities to
   components.css (fleet-wide fix).
2. **benchmark-lab** — homepage reference-leaderboard cards gain
   `ProgressMeter` bars (nDCG vs certification tier threshold) using the
   fixture values it already displays (clearly labeled reference data);
   `/queue` gains the shared pulse treatment on fresh status changes.

Deferred (tracked in TECH_DEBT/queue): finance-lab live simulate UI
(needs `/api/omni` BFF + Operator sign-off on surface), research-rag
`/research-lab` migration to `bh-stage-*`, training-console chrome
convergence, fixture leaderboards → `/v1/models`.

## Phase 4 — Before/after (updated post-implementation)

*See readiness report in the session log; summary appended after
verification below.*

- **Before:** hub homepage: 0 client components, 0 animated elements,
  race log without time/deltas, loop diagram non-interactive.
- **After:** live circuit (poll + detail + stall/pulse), animated race
  feed with deltas, three deploy-gate/burn-down meters, milestone strip,
  count-up stats, ⌘K palette, guided /try with compare mode + evidence
  explainer, one state-reactive mascot beat; shared primitives shipped
  in ui-fleet (`ProgressMeter`, `InteractiveCircuit`, `RaceFeed`,
  `MilestoneStrip`, `CommandPalette`, `CountUpStat`, mascots); dumbmodel
  + benchmark-lab adopted shared primitives; fleet-wide utility classes
  (`bh-mono`, `bh-stack`) defined.

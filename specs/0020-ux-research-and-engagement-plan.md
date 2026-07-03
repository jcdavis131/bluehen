# 0020 — UX research & engagement plan: making the closed loop legible and buyable

- **Status:** Draft (awaiting Operator sign-off)
- **Owner:** Claude (audit + spec) · Cursor (implementation, `lane: cursor` items)
- **Supersedes / Superseded by:** none; extends 0017 (visual voice) and 0019 (corporate topology)
- **Related specs:** [0007](./0007-fleet-registry-and-sites.md), [0012](./0012-synthetic-org-divisions-and-handoffs.md), [0015](./0015-venture-fleet.md), [0016](./0016-dumbmodel-game-layer.md), [0017](./0017-fleet-tastemaker-redesign.md), [0019](./0019-corporate-topology.md)

## Problem

0017 gave the fleet one visual voice. 0019 gave it one corporate story (one company, five revenue-bearing business units). Neither spec audited whether the eight live surfaces actually **work as a funnel** — whether a visitor can move from curiosity to understanding to action to return visit, and whether an external business evaluating Blue Hen RE can tell **which specific things are for sale** and **why the pieces add up to more than one product**.

Operator ask (verbatim intent): review the interfaces, do the UX research, and build a plan that makes every page more intuitive, useful, and engaging — so a visitor *wants to keep exploring end to end* — in service of the thesis that **Blue Hen RE is a closed-loop organization other businesses can buy portions of** (a diagnostic, a certification, a dataset, a research engagement, a signal report — not just "an embeddings platform").

This spec is that plan: an eight-site code-level UX/IA audit, persona-based research against the actual shipped flows, and a prioritized, file-referenced work queue.

## Method (read before trusting any finding below)

Two methods, clearly separated per `SCIENCE_REVIEW.md`'s "measure, don't assert" rule — **neither is a substitute for real user research**, and that gap is itself a finding (§7):

1. **Code-level UX/IA audit** — eight parallel agents each read the actual page/route/component source for one or two sites (not screenshots, not assumptions) and reported: page inventory, navigation, above-the-fold content, every CTA and its destination, cross-site links, engagement primitives used vs. available, and concrete friction points with file:line citations. This is **measured** — every claim below traces to a file.
2. **Persona-based heuristic walkthrough ("simulated interviews")** — for each persona in §2, I walked the actual shipped flow the audit surfaced and wrote the reaction a person in that role would plausibly have. **This is expert/heuristic review, not real user data.** No real visitor was interviewed. Treat every persona quote as a hypothesis about user reaction, not a measured claim — the same discipline `EVIDENCE.md` applies to model claims applies here. §7 recommends closing this gap with real sessions.

## Personas

Derived from the venture-fleet funnel (`HANDOFF.md` §1: dumbmodel → slasso → bhenre → arxiviq) and the "buy a portion" ask.

| Persona | Entry point | Wants |
|---|---|---|
| **P1 — Casual technical visitor** ("Dana," ML engineer, arrives via a shared link or dev-Twitter) | dumbmodel.com | A fast, free, no-signup answer to "is my embedding model collapsing," then a reason to trust the org enough to look further |
| **P2 — Evaluating buyer** ("Priya," eng lead at a company deciding whether to pay for something) | slasso.com or arxiviq.com | Proof this beats what she already has, a legible price, and a way to buy *just the piece she needs* without reading the whole platform story |
| **P3 — Portfolio buyer** ("Marcus," a partner/BD contact deciding whether to license or co-invest in **multiple** business units) | bhenre.com (direct, or referred) | A single page that shows everything Blue Hen RE sells, how the pieces connect (the closed loop), and proof each piece is real, not five disconnected microsites |
| **P4 — Returning explorer** (anyone from P1–P3, second visit) | any site, via bookmark or the fleet switcher | A reason to come back — new data, saved progress, or something that changed since last time |
| **P5 — Operator** (you) | jcamd.com / training.jcamd.com | To run the org, not read marketing copy — but still needs the cockpit itself to be legible when something is unset or broken |

## Findings

### 3.1 Persona walkthroughs (heuristic, see Method)

**P1 — Dana lands on dumbmodel.com.** The hook lands: `TitleCard` reads "How dumb is your model?" with a one-sentence free/no-signup pitch (`apps/sites/dumbmodel/app/page.tsx:41-45`), and `/check` genuinely works client-side against `/api/diagnose` — no dead tool behind a marketing page, which is the single best-executed flow in the fleet. Dana runs a check, gets a real score. She wants to **share it** — the only share affordance is a raw `/api/og?...` PNG URL (`components/HealthCheckPanel.tsx:157-164`), not a page she or a follower can revisit, so the loop that would bring new visitors in dies at the first share attempt. She notices "Hall of Cone" implies a leaderboard, clicks it, and finds a static fixture table her own score never joins — the gamified promise the copy makes isn't backed by the mechanic. She leaves with a positive impression of the free tool and no reason to come back tomorrow.

**P2 — Priya lands on slasso.com evaluating certification.** The homepage pitch is clear and B2B-appropriate ("get your RAG stack certified — a paid, reproducible run with a published, linkable scorecard," `apps/sites/validation/app/page.tsx:60-64`). She wants to buy. The actual sales page, `/certify`, **is not in the top nav or sitemap** — it's reachable only via one inline text link in body copy (`SITE_NAV.validation` in `packages/fleet/src/narrative.ts` lists Overview/Try/Queue/Scorecards/Feedback, no Certify). Meanwhile `/queue`, which reads like an internal BD pipeline dashboard with statuses like "rejected," sits front-and-center in the nav and is publicly indexed. Priya has to hunt for the buy button while an ops artifact gets equal billing with it. If she clicks through to a published scorecard — the exact artifact meant to be forwarded internally as proof — it renders as raw, unstyled markdown inside a `<pre>` tag (`app/scorecards/[slug]/page.tsx:139-145`), which reads as a leaked text file, not a certificate. This is the highest-leverage fix in the whole audit: the paid conversion path on the paid-conversion site is the weakest link in its own funnel.

**P3 — Marcus wants to see everything for sale.** He starts at bhenre.com. The homepage's "organization" section (shipped today, SITE-014/015) does list all five business units with a role sentence and domain (`apps/sites/storefront/app/page.tsx` "The organization" `RuledSection`) — this is real and good. But it frames the BUs as *divisions*, not *things you can buy*: there is no single page that says "here is what Blue Hen RE sells, division by division, and here is the price or the ask for each." `/pricing` exists but is three generic platform tiers (Evaluation Sprint / Managed Embeddings / Enterprise Platform) with **no connection to the five BUs Marcus just read about** — dumbmodel's credits, slasso's certification fee, arxiviq's design-partner seat, and refinery's dataset licensing are four separate, disconnected purchase paths that never appear on `/pricing` at all. Marcus has to visit five sites and reconstruct the portfolio himself. This is the direct gap between what's built and the "closed loop org you can buy portions of" thesis — the parts are real; the portfolio view that sells them as a set does not exist yet.

**P4 — a returning visitor gets almost nothing.** `ReturnGreeting`, `ExplorationTracker`, `MilestoneStrip`, and `CountUpStat` are real, shipped components in `@synthaembed/ui-fleet` and are used on storefront and (partially) hq — but a repeat-of-audit grep found **zero usage** on dumbmodel, validation, simulation, or refinery. Four of five business units currently give a second-time visitor an identical page to their first visit. The mechanism to make return visits feel like progress exists; it's wired into one site out of eight.

**P5 — the Operator opens hq without `API_SECRET_KEY` set locally.** The cockpit doesn't fail loudly — `getFleetStatus()` and the admin panels silently return null/empty, and the homepage shows a bare "Set API_SECRET_KEY" string in one stat tile with no other explanation (`apps/hq/app/page.tsx`). The nav also lists "Org" and "Org Reports" as two separate links to the identical `/org` route (`SITE_NAV.hq`) — a small but real signal that hq's own IA hasn't had the same scrutiny as the public sites.

### 3.2 Cross-cutting root causes

These four patterns explain most of the eight sites' friction — fixing the pattern once (in shared code) is cheaper than fixing eight instances:

1. **Design-system adoption is uneven, not absent.** `@synthaembed/ui-fleet` ships real engagement primitives (`ReturnGreeting`, `ExplorationTracker`, `CommandPalette`, `MilestoneStrip`, `CountUpStat`, `TeamStrip`) and real structural ones (`ClosedLoopDiagram`, `TTYFrame`). Storefront and hq use a good slice of them; dumbmodel, validation, simulation, and refinery use almost none. The gap isn't invention, it's rollout — same lesson 0017 already names for visual tokens, now true for behavior.
2. **At least one broken or context-dropping flow per newer surface.** Observatory's primary click-through 404s (`app/page.tsx:107` → no `app/runs/[id]/page.tsx`, despite `components/RunDetail.tsx` being fully built and unused). Refinery's `/requests?dataset=` silently drops the dataset the visitor clicked through on (`app/requests/page.tsx` never reads `searchParams`). Simulation's four `/simulate/[platform]` pages are CLI dumps with no back-link. These are functional bugs, not polish, and each currently breaks exactly the "go deeper" step that the audit found each site's home page invites.
3. **Registry/copy drift.** `refinery`'s domain in `config/fleet.json` is still `refinery-zeta.vercel.app` while storefront's copy and refinery's own `metadataBase`/sitemap already say `data.bhenre.com`; `simulation`'s `orgDivision` is `bd` in the registry but spec 0019's own topology table calls it `execution`, so `TeamStrip` shows a division label that contradicts the spec governing that page. Small, but they undercut the "one governed hand" story 0017/0019 exist to tell.
4. **B2B voice guardrail (CLAUDE.md: "measured, evidence-backed, not sports metaphors") is holding on marketing copy but not on technical copy.** Raw ops commands and unexplained ML hyperparameters are shown directly to public visitors on `apps/sites/research/app/methods/page.tsx`, `components/ArxivExamDemo.tsx`, and `apps/sites/simulation/app/page.tsx`'s "Agent workerbees" section — content written for an internal engineer, shipped on a public sales page.

### 3.3 The core gap for the "buy a portion" thesis

Every business unit **can** be bought or engaged today (free check, certification fee, design-partner seat, dataset request, waitlist) — the individual offers are real, not aspirational. What's missing is the page that says all five belong to one governed loop and can be combined: a **portfolio view**. This is the single highest-leverage gap for the Operator's stated vision, and it's a content/IA problem, not a new capability — every fact it needs already exists in `config/fleet.json` and each BU's own offer copy.

## Goals

1. Fix the flows that actively mislead or dead-end a visitor (§3.2.2, §3.2.3) — trust is table stakes before "engaging" matters.
2. Ship a portfolio view that states, in one place, everything Blue Hen RE sells and how the pieces form a closed loop (§3.3) — the direct answer to "craft this vision more clearly."
3. Roll the existing (already-built) engagement primitives out to the four BUs that don't use them yet, so a second visit feels different from a first.
4. Hold the line on enterprise B2B voice on every public-facing page, including the technical ones.
5. Replace this spec's heuristic-review method with real user sessions once the P0/P1 fixes ship (§7) — per `SCIENCE_REVIEW.md`, a heuristic finding is a hypothesis, not evidence.

## Non-goals

- New business units, new revenue mechanisms, or pricing amounts — Operator decision, out of scope here.
- Redesigning the visual system — 0017 owns that; this spec only adds behavior/content on top of it.
- Backend/ML changes — no training, eval, or engine work in this spec.
- Real user research execution — this spec proposes it (§7) but running it needs the Operator's participant access, which this agent doesn't have.

## Plan

Phased Now/Next/Later to match `docs/EXECUTIVE_ROADMAP.md`'s format. Each item becomes a `config/work_queue.json` entry (`UX-1xx`, spec `0020`) — see `TASKS.md` after this spec lands. File paths below are the audited source, not proposals.

### P0 — Fix broken/misleading flows (trust, days not weeks)

| ID | Fix | File |
|---|---|---|
| UX-101 | Wire `components/RunDetail.tsx` into a real `app/runs/[id]/page.tsx` route — homepage's only click-through currently 404s | `apps/sites/observatory/` |
| UX-102 | Read `searchParams.dataset` in `/requests` and pass it as `presetTopic` — currently dropped silently | `apps/sites/refinery/app/requests/page.tsx` |
| UX-103 | Replace the CLI-dump `/simulate/[platform]` pages with a rendered result, or remove the "Run paper sim →" CTA until there's something to show | `apps/sites/simulation/app/simulate/[platform]/page.tsx` |
| UX-104 | Add `/certify` to `SITE_NAV.validation`; reconsider whether `/queue` (reads as internal ops) belongs in public nav + sitemap | `packages/fleet/src/narrative.ts`, `apps/sites/validation/app/sitemap.ts` |
| UX-105 | Render scorecard bodies as formatted markdown, not a raw `<pre>` dump — this is the artifact meant to be linked externally | `apps/sites/validation/app/scorecards/[slug]/page.tsx` |
| UX-106 | Dedupe the `/org` nav entry (currently listed twice as "Org" and "Org Reports") | `packages/fleet/src/narrative.ts` `SITE_NAV.hq` |
| UX-107 | Fix `simulation` `orgDivision` (`bd` → `execution`, per spec 0019's own topology table) so `TeamStrip` stops contradicting the spec that governs it | `config/fleet.json` |
| UX-108 | Reconcile refinery's registry domain with its hardcoded `metadataBase`/sitemap host (`data.bhenre.com` vs `refinery-zeta.vercel.app`); fix the same mismatch in storefront's BU tile copy | `config/fleet.json`, `apps/sites/refinery/app/layout.tsx`, `apps/sites/storefront/app/page.tsx` |

### P1 — Make "buy a portion of the org" explicit (the vision ask)

| ID | Fix | File |
|---|---|---|
| UX-110 | New storefront section/page: a portfolio matrix — one row per business unit, its offer, its price/ask, and a direct CTA (free / fee / seat / dataset / waitlist) — the page Marcus (P3) is currently missing | `apps/sites/storefront/app/` (new route or homepage section), sourced from `config/fleet.json` |
| UX-111 | Rework `/pricing` to reference the same per-division offer matrix instead of three tiers disconnected from the five BUs | `apps/sites/storefront/app/pricing/page.tsx` — depends on UX-110 |
| UX-112 | Give arxiviq's "design-partner seat" and dumbmodel's "credits" CTAs a dedicated anchor/offer instead of dropping into the generic `/store` | `apps/sites/research/app/page.tsx`, `apps/sites/dumbmodel/components/HealthCheckPanel.tsx`, `apps/sites/storefront/app/store/page.tsx` |
| UX-113 | Registry-driven "Also from Blue Hen RE" cross-sell strip at the bottom of every BU homepage (not just the collapsed fleet-switcher dropdown) | `packages/ui-fleet/src/` (new primitive) + all five BU homepages |

### P2 — Engagement / stickiness (make return visits feel different)

| ID | Fix | File |
|---|---|---|
| UX-120 | Wire `ReturnGreeting`, `ExplorationTracker`, `MilestoneStrip`, `CountUpStat`, `CommandPalette` into dumbmodel, validation, simulation, refinery (already built, used on ≤2 of 8 sites) | four site `app/layout.tsx` / homepage files |
| UX-121 | Let `/hall` (Hall of Cone) accept consented, user-submitted scores from `/check` so it becomes a live leaderboard instead of a static fixture table — matches the brand's own promise; ties into spec 0016's consent flywheel | `apps/sites/dumbmodel/app/hall/`, `/api/diagnose` |
| UX-122 | Turn the health-check share card into a permalinked `/check/[id]` results page (renders the OG image as its preview) instead of a bare PNG URL | `apps/sites/dumbmodel/components/HealthCheckPanel.tsx`, new `app/check/[id]/page.tsx` |
| UX-123 | Put `TeamStrip` (or its byline) on interior pages too, not just each BU's homepage, so a deep-linked visitor still sees org context | catalog/dataset/contribute/requests pages on refinery; equivalent interior pages elsewhere |
| UX-124 | Add a real live proof metric to simulation's homepage (waitlist size or reports-in-review count) — spec 0019 §2.4 requires one, simulation currently has none | `apps/sites/simulation/app/page.tsx` |

### P3 — Voice/trust polish

| ID | Fix | File |
|---|---|---|
| UX-130 | Move raw CLI commands and unexplained ML hyperparameters off public pages, behind an explicit "for engineers" disclosure | `apps/sites/research/app/methods/page.tsx`, `components/ArxivExamDemo.tsx`, `apps/sites/simulation/app/page.tsx` |
| UX-131 | hq: replace the silent "Set API_SECRET_KEY" empty state with an explicit diagnostic (what's missing, how to fix) | `apps/hq/app/page.tsx` |
| UX-132 | hq: add one line of homepage copy stating it's the internal cockpit of a company that also has a public site — today that context lives only in the footer/dropdown | `apps/hq/app/page.tsx` |

## Acceptance criteria

1. Every P0 item: the previously-broken flow completes end to end (manually verified — a route that 404'd now renders; a dropped query param now reaches the form; a dead-end CTA now leads somewhere real).
2. UX-110/111: a single page enumerates all five business units' offers with working CTAs, and `/pricing` links to or embeds it — verified by `pnpm review` (build passes) plus a manual click-through of every CTA on that page.
3. UX-120: each of the four target sites renders at least one of `ReturnGreeting`/`ExplorationTracker`/`MilestoneStrip` on a second visit (cookie/localStorage-driven state changes visibly) — no fabricated "engagement" copy; the mechanism must be real per `SCIENCE_REVIEW.md`.
4. No item ships with invented metrics, fake counts, or "coming soon" copy presented as live — matches the existing venture eval gate in spec 0015.
5. `pnpm review` stays green after each item; no regressions to the spec 0017 tastemaker CI gate (`scripts/check-tastemaker.mjs`).

## Test plan

- Manual click-through per site (no automated e2e suite exists for these sites yet) — each P0/P1 item's acceptance criterion above is the test.
- `pnpm review` (build + typecheck) on every PR touching these files.
- Before/after screenshot pair for UX-105 (scorecard rendering) and UX-110/111 (portfolio page) attached to the work-queue notes, per the Operator's existing screenshot-review habit (spec 0017 Phase 6).

## Rollout & rollback

Each `UX-1xx` item is an independent PR against one or two files/routes — no shared migration, no flag needed. Revert per-PR if a fix regresses a working flow.

## Risks

- **Scope creep into a full redesign.** Mitigated by scoping every item to a named file and a one-sentence fix; anything larger (new BU, new pricing model) is explicitly a non-goal requiring a separate spec.
- **Heuristic findings mistaken for measured user behavior.** Mitigated by the Method section's explicit disclosure and by §7 below proposing real research as the next step, not a substitute already taken.
- **Registry drift recurring** (§3.2.3) — the same class of bug (copy says one domain, config says another) can reappear; no automated check exists today. Worth a follow-up lint (`scripts/check-tastemaker.mjs`-style) if it recurs after this pass.

## §7 — Closing the "simulated interview" gap

This spec's persona walkthroughs (§3.1) are expert heuristic review, explicitly not real user data. The honest next step, once P0/P1 ship: 5–8 real moderated sessions (2–3 practitioners for dumbmodel/slasso, 2–3 technical buyers for arxiviq/refinery, 1–2 informal Operator-network contacts for the portfolio page) walking the same tasks used here — run the free check, try to buy a certification, find "everything Blue Hen RE sells." That is Operator-owned (participant access, scheduling) and out of scope for this agent to execute; this spec only recommends it and defines the tasks it should test.

# Fleet site architecture — each surface, and how they hold each other up

> Lead Designer / Sr Full-stack view · 2026-07-03
> Registry of record: `config/fleet.json` · Design system: `packages/ui-fleet`
> (tokens.css + components.css) · Data spine: core-api via `synth-core`/BFF
> routes only — **no site ever touches Postgres or torch directly.**

## The business objective (canonical, Operator-set 2026-07-04)

Blue Hen RE is an **asset factory with storefronts**: a closed-loop
ecosystem that grows and maintains itself. The operating loop produces
sellable assets as byproducts of its own self-improvement — models,
datasets, scorecards, reports, knowledge — the sites list them,
customers self-serve, billing is event-driven, and every customer
interaction feeds the loop as data. Human effort concentrates on gates
and direction, never on transactions. Viability test: revenue accrues
while nobody is watching, and each sale makes the next asset better.

**The market face (Operator, 2026-07-04): RE = Recommend Everything.**
Custom RAG and embedding-model solutions for anything — SOTA
recommendation engines for every business, out of the box. The promise
is the machinery: a customer brings a corpus and interaction exhaust;
the loop trains their domain model, gates it against baselines, and
serves recommendations that improve automatically. Every business unit
is a demonstration of that promise on a different domain.

**One-model refinement (Spec 0030, 2026-07-04):** the embedding model
(BlueHen-Embed, instruction-adaptable, CPU-free-tier hostable) is the
package's center of gravity — essential by integration (conventions,
skills, harness configs), not by benchmark bravado. Revenue sequence:
consulting NOW (invoiced), managed tuning + re-certification RECURRING,
model + package FREE (distribution). dumbmodel.com is THE demo site.

**Strategic roles (Spec 0023):** Blue Hen = the horizontal product ·
ArXivIQ = the R&D pipeline · DumbModel = the automated evaluator ·
Jcamd = the orchestration core. Verticals (real estate first) are
proving tenants. Blueprint status: shared-core + tenant-adapters is
SHIPPED (resident backbone + Postgres heads); R&D auto-pipe and anchor
tenant are slated (RDPIPE-*, ANCHOR-001).

### The flywheel ledger (who produces, sells, feeds)

| Site | Uniquely produces | Sells (passive) | Feeds |
|---|---|---|---|
| company (bhenre) | trust: story, gates, evidence | all checkout; metered API P1 | every BU's conversion endpoint |
| dumbmodel | consented text + attention | — (funnel by design) | training data; primed buyers → slasso |
| slasso | scorecards (credibility artifacts) | automated certification P4 | proof for company claims; scorecards → refinery |
| arxiviq | living proof (panel-beating search) | subscriptions/engagements | the case study all sites cite; corpus trains champion |
| refinery | datasets + self-writing wiki | corpus access P3; harvests | corpora for all; wiki = compounding SEO surface |
| signals | simulation reports | premium notes P5 | generality proof beyond prose |
| hq/observatory | legibility of the loop | — | the "governed" trust layer |

## The shape of the whole

Seven surfaces, one spine, two loops:

```
                    ┌─────────────────  MONEY LOOP  ─────────────────┐
                    ▼                                                │
  dumbmodel ──funnel──▶ validation ──proof──▶ storefront ──orders──▶ Medusa
      │                     │                     │  ▲                │
      │ consented samples   │ scorecards          │  └─ briefings/leads
      ▼                     ▼                     ▼
  ┌──────────────────  DATA LOOP (datalab inbox → OKF datasets)  ────────┐
  │                                                                      │
  ▼                                                                      │
 core-api ◀──── research (arxiviq queries) ◀── simulation (waitlist) ────┘
  │  ▲
  │  └── worker: train → gates → BD queue → charter → deploy → index
  ▼
 hq (the cockpit reads everything) ── observatory (watches training breathe)
```

- **Money loop:** free proof → paid certification → company-site checkout.
- **Data loop:** every consented interaction becomes an OKF dataset the
  worker trains on; better models make every surface's proof stronger.
- **hq + observatory** are the org's eyes; they consume everything and
  sell nothing.

## Corporate topology (Spec 0019 — normative)

ONE company website; the rest are sub-team business units or internal
consoles. `config/fleet.json#orgRole` is the source of truth; chrome
(switcher, footer) derives its groups from it.

| orgRole | Sites | Job |
|---|---|---|
| company | storefront (bhenre.com) | The company itself: brand, divisions overview, operating loop, all commerce |
| business-unit | dumbmodel · validation · research · simulation · refinery (0018) | Sub-team sites that build, serve, and generate revenue (funnel, certification fees, engagements, premium reports, datasets) |
| internal | hq · observatory | Cockpit + telemetry; visible in chrome, never sold |

Cross-link contract: BUs route commerce/legal/contact up to the company
site; the company site presents every BU as "our teams" with their
offer; leads carry source=<siteId> for attribution.

## Per-site architecture

### 1 · storefront — bhenre.com (the brand & the till)

**User:** B2B buyer evaluating embedding operations. **Job:** convert
credibility into briefings and orders.

- **IA:** `/` (brand hero + honest live stats + milestone strip) ·
  `/try` (proof: guided live search + compare mode) · `/research`
  (experiment museum) · `/pricing` → `/store` (Medusa) → `/contact`
  (briefing) · `/legal/*`.
- **Reads:** `/healthz`, `/v1/budget`, `/v1/ledger`, `/v1/models` via BFF;
  Medusa Store API server-side (`lib/commerce.ts`, provider-agnostic).
- **Writes:** leads (`/api/contact` → core-api `/v1/leads` once REV-904
  lands), orders (Medusa cart handoff).
- **Signature primitives:** hero CTA, ProgressMeter vs deploy gates,
  MascotBeacon, ExplorationTracker, ⌘K palette.
- **Supports:** every other site links here to transact; hq receives its
  leads/orders as ops signal.
- **Ideal-state gaps:** Medusa on Railway (files ready); order/lead
  events into the ledger so hq's race feed shows *commerce* stages too.

### 2 · hq — jcamd.com (the cockpit)

**User:** Operator + agents. **Job:** one place where the whole loop is
visible and steerable.

- **IA:** `/` (fleet directory + live InteractiveCircuit + RaceFeed +
  MilestoneStrip + cross-tenant status) · `/actions` (lifecycle controls,
  BD promotion) · `/feedback`.
- **Reads:** `/v1/admin/fleet` (admin), `/v1/ledger`, `/v1/models`;
  ideal: `/v1/runs` (admin) for a training strip fed by the Observatory's
  same data.
- **Writes:** hill-climb kicks, charters, promotions (admin key,
  server-side only).
- **Supports:** it is the org's shared source of "what's happening" —
  every team report (knowledge/teams) should surface here. **Ideal:** an
  `/org` page rendering the OKF team digests + STATUS board (docs are
  the data; zero new backend).
- **Gaps:** org page; commerce events in feed; admin runs strip.

### 3 · dumbmodel — dumbmodel.com (the loud front door)

**User:** ML practitioners on dev social. **Job:** viral, honest proof →
top of funnel + consented data.

- **IA:** `/` (the dare) · `/check` (health check — THE product) ·
  `/compare` · `/hall` · `/museum` (failure modes). Spec 0016 adds the
  game layer (labels flywheel) after sign-off + rate limiting.
- **Reads/Writes:** `/api/diagnose` BFF → `/v1/diagnose` (measured rank
  diagnostics; consented samples → datalab inbox).
- **Voice discipline:** roast collapsed *representations*, never users;
  every punchline traces to a measured number.
- **Supports:** feeds validation (users who need rigor) and storefront
  (credits CTA); feeds the data loop its most distinctive dataset
  (user-submitted text with consent).
- **Gaps:** REV-903 rate limiting before promotion; share-card OG images
  (each check result should be tweetable — pure OG-image route, no new
  data); Spec 0016 games.

### 4 · validation — slasso.com (the referee)

**User:** teams shipping RAG who need to prove it. **Job:** paid,
reproducible certification; the org's credibility organ.

- **IA:** `/` (tiers + reference leaderboard w/ gate meters) · `/certify`
  (the offer) · `/try` (harness preview) · `/queue` (promotion queue —
  the org eating its own dog food publicly) · `/feedback`.
- **Reads:** BD queue (`/v1/bd/queue`), eval fixtures; ideal: published
  scorecards as first-class OKF documents rendered from
  `content/fleet/bd/scorecards/` (now a datalab source — the referee's
  rulings become training data).
- **Supports:** certifications hyperlink back to customers (inbound
  credibility); scorecards feed hq and the data loop; failed pilots feed
  R&D failure analysis (the Spec 0012 handoff).
- **Gaps:** live leaderboard from `/v1/models` instead of fixtures
  (labeled honestly until then); public scorecard permalinks.

### 5 · research — arxiviq.com (the demo that is the product)

**User:** researchers/students. **Job:** retrieval assistant good enough
to subscribe to; the org's public lab notebook.

- **IA:** `/` (live tier-compare over arXiv) · `/methods` · `/research-lab`
  (registry) · `/feedback`.
- **Reads:** `/api/search` (tiered), `/api/models`, `/api/status`;
  registry JSON (ideal: from core-api model lifecycle, not a flat file).
- **Writes (gated):** query logs → datalab, **only after** the Spec 0015
  consent UI ships — this is its data-loop contribution and it stays off
  until then.
- **Supports:** proves serving quality for storefront's claims; its
  corpus (arXiv, now RSS-fed daily) is the R&D training bed; the tier
  compare is the living ad for Matryoshka serving.
- **Gaps:** consent UI + query-log flywheel; registry from live API.

### 6 · simulation — signals.bhenre.com (the contained experiment)

**User:** quant-curious readers. **Job:** publish measured paper-trading
reports; grow a waitlist; **never** touch live capital (Spec 0013 wall).

- **IA:** `/` (venture hero + waitlist + engine card + platform cards) ·
  `/simulate/[platform]` (ideal: render real `/v1/omni/simulate` output
  — sharpe/turnover/rules-applied — instead of CLI copy).
- **Reads:** `/v1/omni/platforms`, `/v1/omni/simulate` (BFF to add);
  **Writes:** waitlist leads.
- **Supports:** stress-tests the platform's generality (the one tenant
  whose corpus is market state, not prose); its reports are storefront
  marketing material with evidence discipline.
- **Gaps:** OMNI-004 (integration test, cursor lane) then the live
  simulate page; report archive as OKF documents.

### 7 · observatory — training.jcamd.com (the heartbeat)

**User:** R&D + Operator. **Job:** watch models learn or collapse in
real time; the org's honesty instrument.

- **IA:** `/` (run list) · `/runs/[id]` (loss/rank/R2D charts, collapse
  alerts, surgery events, config).
- **Reads:** runboard store via `NEXT_PUBLIC_TELEMETRY_URL` (local dev)
  or core-api `/v1/runs` (admin) — prod runs now exist on the Railway
  volume (worker records every job).
- **Supports:** R&D triage (collapse WATCH items cite its run ids);
  Observatory charts are dumbmodel's museum exhibits in the making —
  the same failure taxonomy, live.
- **Gaps:** point prod Observatory at core-api runs (needs a scoped
  read token story — currently admin-only by design); run-compare view.

## Interaction contracts (what keeps this coherent)

1. **One design system.** All seven wear `ui-fleet` tokens + primitives;
   a primitive built for one site (DumbnessMeter → ProgressMeter) is
   promoted, never forked. Per-site identity = accent token + voice,
   nothing structural.
2. **One data spine.** Sites speak only to their own BFF routes; BFFs
   speak only to core-api/Medusa. Adding a surface = re-exporting a
   shared route, never a new client.
3. **One evidence rule.** A number renders only if a tool measured it;
   absent data shows an honest empty state with the command to fix it.
4. **One flywheel.** Every venture's consented output lands in the
   datalab inbox with provenance → OKF card → training → better models →
   stronger proof on every other site. The sites don't just cross-link;
   they *compound*.

## Hosting reality (constraint on the ideal)

Railway plan caps containers at **1 GB** — two torch runtimes (API +
worker) cannot coexist; head-only training + supervised restarts are the
current mitigation. **The $5 plan upgrade (8 GB) restores full
fine-tuning in prod**; alternative is the head-only artifact split
(backbone from HF at serve time, head weights in Postgres). Operator
decision pending — everything above degrades gracefully until then.

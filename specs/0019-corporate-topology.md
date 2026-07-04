# Spec 0019 — Corporate topology: one company site, revenue-bearing business units

**Status:** Active (Operator-directed 2026-07-03)
**Refines:** Spec 0015 (venture fleet) · Spec 0012 (operating loop) · Spec 0018 (refinery)
**Owner:** Claude (topology layer, chrome) · Cursor (company-site restructure, BU team strips)

## 0. The objective this topology serves (Operator, 2026-07-04)

A viable business as a closed-loop ecosystem that grows and maintains
itself, passively providing valuable goods and services for purchase.
The loop produces assets; the sites are storefronts; billing is
automated; interactions feed the loop. See docs/SITE_ARCHITECTURE.md
"flywheel ledger" for the per-site produce/sell/feed contract.

## 1. The model

Blue Hen RE is **one company** with **one corporate website** and a set
of **sub-team business units** — user-facing sites that build things,
provide services, and generate revenue. Internal consoles are visible in
chrome but marked as operations, never sold.

| orgRole | Site | Team (division) | Builds / sells | Revenue path |
|---|---|---|---|---|
| **company** | storefront · bhenre.com | Corporate | The company itself: brand, divisions overview, operating loop, store, pricing, contact | All commerce checks out here (Medusa); BU leads roll up here |
| business-unit | dumbmodel.com | Diagnostics (data) | Free embedder health checks, collapse diagnostics | Funnel: credits upsell + consented data; no direct billing |
| business-unit | slasso.com | Certification (bd) | Paid RAG certification, published scorecards | Certification fees (via company store) |
| business-unit | arxiviq.com | Applied Research (research) | Live retrieval assistant, method registry, case studies | Subscriptions (later) + research engagements (leads) |
| business-unit | signals.bhenre.com | Signals (execution) | Paper-trading strategy reports — **simulation only** (Spec 0013 wall) | Waitlist → premium reports (later) |
| business-unit | data.bhenre.com (refinery, Spec 0018) | Data Operations (data) | Provenance-carrying datasets, custom harvests, dataset prep | Harvest/prep engagements + premium datasets |
| internal | jcamd.com (hq) | Orchestration | The cockpit: fleet map, lifecycle controls, org reports | — |
| internal | training.jcamd.com (observatory) | R&D telemetry | Run monitoring, collapse alerts | — |

## 2. Normative rules

1. **`orgRole` lives in `config/fleet.json`** (`company | business-unit |
   internal`) — the registry stays the single source of truth; chrome,
   footers, switcher groups, and sitemaps derive from it, never hardcode.
2. **Cross-link contract:** every BU links up to the company site for
   commerce/legal/contact (already true); the company site lists every
   BU as "our teams" with their revenue offer, not just their name.
   Internal sites are shown in chrome (transparency) but `noindex`
   (observatory today; hq stays indexable as the public org face).
3. **Revenue attribution:** leads carry `source=<siteId>` (shipped);
   orders reference the originating BU in cart metadata when initiated
   from a BU CTA (queued). The ledger's tenant scoping already gives
   per-BU operational accounting.
4. **Team identity:** each BU carries a "team strip": which division
   runs it, what it builds, what it sells, and its live proof metric —
   measured, or the honest empty state.
5. **One brand system:** BUs keep product brands (dumbmodel, SLASSO,
   arxivIQ, Signals, Refinery) under "a Blue Hen RE company" bylines —
   the switcher and footer already say the rest.

## 3. Work items

- TOPO-001 (claude): `orgRole` in fleet.json (+ refinery placeholder,
  status `planned`); chrome groups derive from orgRole; narrative roles
  reframed as team/offer statements. — this spec's commit
- SITE-014 (cursor): storefront homepage restructure as the **company
  website**: hero = the company, divisions overview grid (from registry),
  operating-loop diagram, then store/pricing; BU cards carry offers.
- SITE-015 (cursor): BU team strips on all five BU homepages (division,
  offer, live proof metric via each site's status API).
- TOPO-002 (claude): order attribution metadata from BU CTAs (with
  Medusa cart handoff work).

## 4. Non-goals

Reorganizing tenants/workspaces (site ids unchanged); renaming domains;
moving commerce off the company site; any org chart beyond the five
divisions of Spec 0012.

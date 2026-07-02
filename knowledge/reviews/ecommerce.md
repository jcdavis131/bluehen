---
type: Review
title: E-commerce Best Practices Review
description: Conversion, trust, and commercial-readiness assessment of the four public fleet sites (hub, dumbmodel, benchmark-lab, research-rag).
tags: [review, ecommerce, growth]
timestamp: 2026-07-02T12:00:00Z
reviewer: ecommerce-sme
status: living
---

# Charter

Scope: the public commercial surfaces of the Blue Hen RE platform — Platform Console (`apps/sites/hub`, bhenre.com), Baseline Comparison (`apps/sites/dumbmodel`, dumbmodel.com), Validation Lab (`apps/sites/benchmark-lab`, slasso.com), Applied Research (`apps/sites/research-rag`, arxiviq.com) — plus the shared chrome and narrative layer (`packages/ui-fleet`, `packages/fleet`) and public data (`packages/eval-public`). Judged as B2B commercial surfaces: value-proposition clarity, calls to action, trust and evidence presentation against the "measured, evidence-backed" brand promise, navigation to contact/signup paths, SEO basics, performance-relevant patterns, cross-site brand coherence, and the gaps between what exists today and what a customer needs to evaluate and buy.

This is a living document. New findings are appended under dated headings in **Findings**; resolved findings are annotated in place rather than deleted. Related reviews: [UX / UI Review](ux-ui.md), [Security Review](security.md), [General Usability Review](usability.md).

# Findings

## 2026-07-02

| ID | Severity | Finding | Location |
|----|----------|---------|----------|
| EC-001 | high | No commercial path exists anywhere: no pricing, contact, sales email, signup, trial, or demo-request on any public site | all four sites (`apps/sites/*/app`) |
| EC-002 | high | Public leaderboard publishes fabricated metrics under named competitor products (OpenAI, Microsoft, BAAI, Alibaba) with mocking taglines | `packages/eval-public/src/baselines.ts` |
| EC-003 | high | dumbmodel "side-by-side" comparison simulates the baseline side from static bias weights while presenting it as measured retrieval | `apps/sites/dumbmodel/components/ComparePanel.tsx`, `apps/sites/dumbmodel/app/compare/page.tsx` |
| EC-004 | high | Public pages surface internal failure states and dev commands ("API offline", "Run: pnpm bootstrap:orgs", "check SYNTH_API_KEY") | `packages/ui-fleet/src/LiveSearchPanel.tsx`, `apps/sites/research-rag/components/ArxivExamDemo.tsx`, `apps/sites/benchmark-lab/app/queue/page.tsx`, `apps/sites/hub/app/page.tsx` |
| EC-005 | medium | Hardcoded `http://localhost:3004` link ships to production on the hub Research Registry page | `apps/sites/hub/app/research/page.tsx` |
| EC-006 | medium | SEO baseline missing fleet-wide: no metadataBase, Open Graph/Twitter cards, robots.txt, sitemap, or favicons; some layouts export no metadata | `apps/sites/*/app/layout.tsx` |
| EC-007 | medium | Homepages assume insider vocabulary and present operator telemetry instead of a buyer-facing value proposition | `apps/sites/hub/app/page.tsx`, `packages/fleet/src/narrative.ts` |
| EC-008 | medium | Internal resource budget ("$X left · ceiling $50") rendered on the public flagship homepage | `apps/sites/hub/app/page.tsx` |
| EC-009 | medium | Cross-site brand incoherence: comedic register on dumbmodel vs enterprise voice elsewhere; three brand names and five domains with no unifying story | `apps/sites/dumbmodel/*`, `packages/fleet/src/narrative.ts` |
| EC-010 | medium | No docs, API reference, quickstart, or onboarding surface; footer/nav route visitors to an operator control plane (jcamd.com) | `packages/ui-fleet/src/FleetShell.tsx` |
| EC-011 | medium | No privacy policy or terms of service; the only capture instrument (feedback form) collects free text with no consent notice or email field | `packages/ui-fleet/src/FeedbackForm.tsx`, all sites |
| EC-012 | low | Benchmark scores hardcoded as constants with no run date, methodology, or reproducibility artifact; roadmap disclaimers in product copy | `packages/eval-public/src/exams.ts`, `apps/sites/benchmark-lab/app/try/page.tsx` |
| EC-013 | low | Global nav links every site to every other, with no CTA hierarchy and operator surfaces exposed to anonymous visitors | `packages/ui-fleet/src/FleetShell.tsx`, `packages/ui-fleet/src/urls.ts` |
| EC-014 | low | Hub homepage server-renders four `cache: "no-store"` fetches against an API defaulting to `http://localhost:8000` — slow TTFB and degraded first paint whenever core-api is unreachable | `apps/sites/hub/app/page.tsx` |

### EC-001 — No commercial path (high)

A full-text sweep of all four public site trees and the shared UI package finds zero occurrences of pricing, contact, sign-up, trial, sales, or `mailto:` anywhere. A prospective customer who is fully convinced by the proof sites has literally no next step: no email address, no form that reaches a human, no calendar link, no waitlist. The feedback form (EC-011) routes into the internal Operations Ledger, not to sales, and does not collect a reply address. For a platform whose sites exist to *sell* embedding/RAG capability, this is the single largest gap; everything else on this list is secondary to it.

### EC-002 — Fabricated competitor metrics presented as measurement (high)

`packages/eval-public/src/baselines.ts` is annotated internally as "demo metrics until eval-harness feeds live gates," yet its contents drive the public "Hall of Cone" leaderboard and the Validation Lab "Reference leaderboard" as if measured: named commercial products (`text-embedding-3-small`, `e5-large-v2`, `BGE-M3`, `Qwen3-Embedding-0.6B`) carry invented effective-rank and nDCG figures, "dumbness scores," and derisive taglines ("API-priced cone," "Open weights, open to collapse"), while the house model is assigned the winning numbers ("Awake. Ranked. Not a cone."). The dumbmodel homepage explicitly claims these are "measured on Blue Hen RE eval gates, not marketing claims." This is the inverse of the brand promise and carries reputational and potential legal exposure (disparagement of named vendors using non-measured figures). Until live eval-harness data feeds these tables, every number must be labeled *illustrative/simulated* — or removed.

### EC-003 — Simulated comparison presented as live (high)

The dumbmodel `/compare` page leads with "Same query and corpus — evaluate retrieval quality across baseline and org-trained embedders," but `ComparePanel.tsx` generates the baseline side via `rankForModel()` over static per-chunk `retrievalBias` weights — a scripted demo, not retrieval. Only the "live" pane can hit core-api. A technical evaluator who inspects network traffic or notices identical results across queries will conclude the proof site is staged, which contaminates trust in the genuinely live surfaces (research-rag tier comparison, live search).

### EC-004 — Internal failure states and dev commands on public pages (high)

When core-api is down or unconfigured — the default state for an anonymous visitor hitting production if the backend hiccups — the flagship homepage badge reads "API offline," arxiviq.com's homepage shows "Offline — see setup below," and error panels instruct the public to run `pnpm bootstrap:orgs`, `pnpm kickoff:research-rag`, or "check `SYNTH_API_KEY`." These are developer runbook strings leaking through `packages/ui-fleet/src/LiveSearchPanel.tsx` and `ArxivExamDemo.tsx`. Commercial surfaces must degrade to cached/static proof with a neutral notice ("Live demo temporarily unavailable"), never to internal tooling instructions.

### EC-005 — Broken production link (medium)

`apps/sites/hub/app/research/page.tsx` links "Full registry on Applied Research →" to `http://localhost:3004/research-lab`. On bhenre.com this is a dead CTA on one of only four nav destinations. The `siteHref()` helper in `packages/ui-fleet/src/urls.ts` exists precisely to resolve this correctly; the page bypasses it.

### EC-006 — SEO baseline missing (medium)

No site defines `metadataBase`, Open Graph, or Twitter card metadata; there are no `robots.txt`, `sitemap.*`, `favicon`, or `icon` files anywhere under `apps/sites/`. `benchmark-lab` and `research-rag` root layouts export no metadata at all (page-level only). The hub's site-wide description is "Platform hub · ASN lifecycle dashboard" — internal jargon (ASN is a training-method codename) as the search snippet for the flagship domain. dumbmodel's title, "How dumb is your embedding?", is at least distinctive, but shares no template with its siblings. Four owned domains with proof content is an SEO asset; today none of it is legible to crawlers or link unfurlers.

### EC-007 / EC-008 — Value proposition and telemetry on the front door (medium)

bhenre.com's homepage is an operator dashboard: API health, resource budget with a $50 ceiling, deployed-model version, a lifecycle ledger with the empty-state "Start core-api and run: `synth budget`." Nowhere does it answer the three questions a first-time B2B visitor has: what is this, who is it for, what does it cost to try. The vocabulary (effective rank, Operating Loop, dual "RE" meaning, production charter) is defined in `packages/fleet/src/narrative.ts` but never explained on-page. Exposing the internal spend budget additionally signals prototype scale and mildly discloses operational information.

### EC-009 — Brand coherence (medium)

The stated voice is "enterprise B2B — measured, evidence-backed." dumbmodel runs a comedy register (cone/hen mascots, "Hall of Cone," "dumbness score," emoji sentiment buttons that also appear in the shared `FeedbackForm` and `LiveSearchPanel` used by *all* sites). A playful top-of-funnel microsite can work, but today the registers bleed both ways: mascots and "Split logged" racing jargon appear in enterprise surfaces, and enterprise boilerplate appears on dumbmodel. Three names (Blue Hen RE, Relay Engine, SynthaEmbed OS) plus five domains are presented with no page explaining the structure; a buyer cannot tell which thing is the product.

### EC-010 / EC-011 — Missing evaluation-and-buy infrastructure (medium)

There is no documentation surface (no /docs, API reference, or quickstart), no security/compliance page, and no privacy policy or terms — the last two are hard procurement blockers for the enterprise segment the copy targets, and a compliance exposure given the sites accept free-text feedback. The shared footer links to the Operations Center (jcamd.com), an operator control plane, from every public page.

### EC-012 / EC-013 / EC-014 — Supporting issues (low)

Benchmark scores in `exams.ts` are string constants with no run date or methodology link, and product copy contains roadmap disclaimers ("YAML exam runner ships in Phase 3"). Global navigation is a flat ring of all sites with no primary-CTA hierarchy. The hub homepage's four uncached server-side fetches against `SYNTH_API_BASE_URL ?? http://localhost:8000` mean TTFB is hostage to backend availability on every request; static or ISR rendering with client-side refresh would protect first paint.

# Recommendations

Prioritized. Items 1–4 constitute the **minimum viable commercial path** — no checkout is required to start selling; a design-partner motion is the right first mechanism for this product.

1. **Ship a contact path this week (EC-001).** One `/contact` route (or section) on all four sites via a shared `ui-fleet` component: short form (name, work email, message) posting to an inbox or CRM webhook, plus a visible `mailto:` fallback and a "Book a technical briefing" primary CTA in the `FleetShell` header. Every proof page ends with this CTA.
2. **Restore evidence integrity before driving traffic (EC-002, EC-003, EC-012).** Either wire the leaderboards to real eval-harness output with run dates and methodology links, or label every simulated number and ranked pane "illustrative demo — not a measurement" and remove named-competitor taglines. The brand promise is the product; this is non-negotiable.
3. **Make bhenre.com the buyer front door (EC-007, EC-008).** Above the fold: one-sentence value proposition in plain language, three proof links (baseline comparison, certified benchmarks, live retrieval), one CTA (contact/briefing). Move budget/ledger telemetry behind the Operations Center or an authenticated view.
4. **Publish a packaging page (EC-001, EC-010).** Even pre-pricing: "Design Partner Program — fixed-scope pilot, certified benchmark on your corpus, production charter on pass. Contact us." This converts the existing Validation Lab narrative into a sellable offer. Add pricing tiers only when two pilots have closed.
5. **Fail gracefully in public (EC-004, EC-014).** Cache last-good demo results; replace dev-command error strings with a neutral unavailable notice; render hub stats via ISR + client refresh so TTFB never blocks on core-api.
6. **SEO/link hygiene pass (EC-005, EC-006).** Fix the localhost link using `siteHref()`; add per-site `metadataBase`, OG/Twitter cards, robots.txt, sitemap, favicons; rewrite the hub meta description without internal codenames.
7. **Procurement basics (EC-011).** Privacy policy and terms in the shared footer; consent line on the feedback form; a one-page security posture summary.
8. **Brand architecture note (EC-009, EC-013).** Decide the register per surface (dumbmodel = playful top-of-funnel, everything else = measured), remove emoji/racing jargon from shared components, and add a short "one platform, four proof surfaces" explainer to the hub; drop the Operations Center from public nav.

# Watchlist

- `finance-lab` (Phase B) and `training-console` — currently domain-less; before either gets a public domain, apply findings EC-004, EC-006, EC-011 preemptively.
- `packages/eval-public` — the moment eval-harness feeds live gates, re-audit EC-002/EC-003/EC-012 and add run-date provenance to every published figure.
- Validation Queue page (slasso.com/queue) — publicly lists internal method names and evidence refs; watch for anything that shouldn't be disclosed pre-publication (coordinate with the [Security Review](security.md)).
- Feedback endpoints — public unauthenticated POST routes on all sites; abuse/spam handling becomes relevant as soon as traffic is driven (also a Security Review item).
- Conversion instrumentation — once EC-001 ships, add basic analytics on CTA clicks so future entries in this review can be evidence-backed.

# Citations

- `apps/sites/hub/app/page.tsx`
- `apps/sites/hub/app/layout.tsx`
- `apps/sites/hub/app/research/page.tsx`
- `apps/sites/hub/app/try/page.tsx`
- `apps/sites/dumbmodel/app/page.tsx`
- `apps/sites/dumbmodel/app/layout.tsx`
- `apps/sites/dumbmodel/app/compare/page.tsx`
- `apps/sites/dumbmodel/app/hall/page.tsx`
- `apps/sites/dumbmodel/components/ComparePanel.tsx`
- `apps/sites/benchmark-lab/app/page.tsx`
- `apps/sites/benchmark-lab/app/try/page.tsx`
- `apps/sites/benchmark-lab/app/queue/page.tsx`
- `apps/sites/research-rag/app/page.tsx`
- `apps/sites/research-rag/components/ArxivExamDemo.tsx`
- `packages/ui-fleet/src/FleetShell.tsx`
- `packages/ui-fleet/src/LiveSearchPanel.tsx`
- `packages/ui-fleet/src/FeedbackForm.tsx`
- `packages/ui-fleet/src/routes/index.ts`
- `packages/ui-fleet/src/urls.ts`
- `packages/fleet/src/narrative.ts`
- `packages/eval-public/src/baselines.ts`
- `packages/eval-public/src/exams.ts`
- `config/fleet.json`

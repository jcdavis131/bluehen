# Spec 0015 — Venture fleet: every public site is a business

**Status:** Ready (Operator approved 2026-07-02; sequencing: dumbmodel first) · **Author:** Claude

## Operator direction (verbatim intent)

> Simplify our sites to each be a specific business venture built and
> maintained by our org — user-facing sites where we test ideas and make
> money through our interactions and data collection efforts.

## Principle

One venture per public domain. Every venture: (a) serves an external
user on its own value proposition, (b) has a monetization path wired to
the shared commerce backend (`services/commerce`) or lead capture,
(c) feeds the data flywheel — consented user interactions become
[datalab](../knowledge/platform/data-pipeline.md) sources with OKF
provenance, which R&D trains on, which improves every venture.
Internal surfaces (control, training-console) are explicitly *not*
ventures and stop competing for public attention.

## Proposed venture map

| Domain | Venture | User | Monetization | Data collected (consented) |
|---|---|---|---|---|
| **bhenre.com** (hub) | Platform front door — managed embeddings & evaluation services | B2B buyer | Pricing tiers → contact briefings; self-serve via store (live) | Leads; live-search relevance feedback |
| **dumbmodel.com** | "How dumb is your model?" — free embedding health check; paste a corpus, get collapse/effective-rank diagnostics | ML practitioners (viral, top-of-funnel) | Free tier → Evaluation Credits (store product exists) | Submitted queries/corpora → eval datasets |
| **slasso.com** (benchmark-lab) | RAG certification — paid benchmark runs with published scorecards | Teams shipping RAG | Certification fee (new store product); published badge links back | Customer eval sets; exam results |
| **arxiviq.com** (research-rag) | Research retrieval assistant over arXiv — the live demo becomes the product | Researchers/students | Design Partner Seat (store product exists); usage-metered API later | Query logs → retrieval training pairs |
| **finance-lab** (Phase B, sim only) | Signal lab — published paper-trading strategy reports; waitlist | Quant-curious | Waitlist → premium research notes (Phase B gate; **no live trading**, Spec 0013) | Simulation telemetry only |

Internal, not ventures: **jcamd.com** (control) — operator console;
**training-console** — R&D observatory.

## What changes per site (scope sketch)

1. Each venture homepage leads with its *user's* problem, not platform
   architecture; platform story moves to bhenre.com.
2. Each site gets: one primary CTA (buy/subscribe/waitlist/briefing),
   a consent-explicit data note (extend `/legal/privacy`), and a
   venture-specific datalab source registered so interactions flow into
   the dataset library.
3. Store gains per-venture products (certification, credits) —
   authored in Medusa Admin, no code.
4. Fleet registry (`config/fleet.json`) gains a `venture` block per
   site (valueProp, cta, dataConsent) so chrome/copy stay config-driven.

## Prerequisites already in place (this week's work)

Commerce backend live · lead capture · continuous dataset builder ·
agent teams (data-harvesting can own venture-source curation) ·
engagement primitives (SITE-004..007) making sites feel alive.

## Eval gate

Per venture: a working CTA path (measured by lead/order records), a
registered datalab source, and privacy copy reviewed. No fabricated
metrics anywhere (SCIENCE_REVIEW.md rule extends to venture claims).

## Decision needed from Operator

1. Approve/adjust the venture map above (esp. dumbmodel's freemium
   framing and slasso certification pricing).
2. Confirm data-collection consent language direction before any
   user-interaction logging is wired to datalab.
3. Sequence: recommend dumbmodel first (highest personality + clearest
   funnel), then slasso certification, then arxiviq subscriptions.

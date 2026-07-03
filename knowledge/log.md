# Update Log

## 2026-07-03
* **Creation**: Collected dataset [arXiv cs.IR daily listing (RSS)](/datasets/20260703-185828-arxiv-cs-ir-daily-listing--rss.md) (1 docs, 27 chunks).
* **Creation**: Collected dataset [Validation Lab — promotion queue and certification scorecards](/datasets/20260703-185827-validation-lab---promotion-queue-and-certificati.md) (1 docs, 1 chunks).
* **Creation**: Collected dataset [Evidence and science review ledgers](/datasets/20260703-185827-evidence-and-science-review-ledgers.md) (2 docs, 30 chunks).
* **Creation**: Collected dataset [Wiki — goals and build docs](/datasets/20260703-185827-wiki---goals-and-build-docs.md) (3 docs, 8 chunks).

## 2026-07-02
* **Creation**: Collected dataset [arXiv cs.IR daily listing (RSS)](/datasets/20260702-185049-arxiv-cs-ir-daily-listing--rss.md) (1 docs, 35 chunks).
* **Creation**: Collected dataset [Validation Lab — promotion queue and certification scorecards](/datasets/20260702-185048-validation-lab---promotion-queue-and-certificati.md) (1 docs, 1 chunks).
* **Update**: Prod backend live — Railway `api` redeployed with current image (db extra + /readyz + telemetry + diagnose), Railway PG migrated to head; deep review persisted (docs/reviews/deep-review-2026-07-02.md), 2 criticals fixed (get_trace RLS, charter/eval gate), REV-901..910 queued; workspace site_id migration staged pending Operator approval.
* **Update**: Fleet rebrand executed (Cursor plan, 8 phases) — ids/dirs/packages renamed (hq, storefront, validation, research, simulation, observatory); role split: jcamd.com is the org hub with the live operating loop, bhenre.com is the storefront; Vercel rootDirectories re-pointed; signals.bhenre.com + training.jcamd.com attached.
* **Update**: Venture fleet complete (Spec 0015, SITE-009..011) — slasso RAG certification (`/certify` + store product, price pending Operator), arxiviq design-partner subscription framing, finance-lab Signal Lab waitlist (simulation-only); venture blocks for all five public sites in fleet.json.
* **Update**: Spec 0015 approved (venture fleet); dumbmodel venture v1 shipped — free embedding health check (`/check`, core-api `/v1/diagnose`), consented submissions → datalab inbox source `dumbmodel-health-checks`, store/briefing CTAs, venture block in fleet.json.
* **Creation**: [Agentic org teams](/platform/agent-org.md) (Spec 0014) — agentkit runtime + Data Harvesting / R&D / Operations teams; first live runs logged in [/teams/](/teams/index.md).
* **Update**: Commerce backend booted on a dedicated local Postgres 16 instance (data/pg-commerce, :5434); BLK-DISK resolved (10.4 GB npm cache was the root cause).
* **Update**: Scaffolded the Medusa v2 backend at `services/commerce` (config, seed with region/products/publishable key, Docker + Railway deploy files) and aligned README/package.json/fleet.json metadata; [commercial platform](/platform/commercial-platform.md) revised.
* **Creation**: [Continuous dataset builder](/platform/dataset-watcher.md) — `datalab watch` with source registry, cadence scheduling, and content-hash dedupe; first pass materialized the two datasets below.
* **Creation**: [Commercial platform](/platform/commercial-platform.md) — hub pricing/store/contact/legal with headless Shopify checkout and lead capture (closes EC-001).
* **Creation**: Collected dataset [Evidence and science review ledgers](/datasets/20260702-110239-evidence-and-science-review-ledgers.md) (2 docs, 27 chunks).
* **Creation**: Collected dataset [Wiki — goals and build docs](/datasets/20260702-110239-wiki---goals-and-build-docs.md) (3 docs, 8 chunks).
* **Creation**: Collected dataset [wiki-smoke](/datasets/20260702-104700-wiki-smoke.md) (2 docs, 5 chunks).
* **Creation**: Five SME reviews landed — [UX/UI](/reviews/ux-ui.md), [Security](/reviews/security.md), [E-commerce](/reviews/ecommerce.md), [Backend Architecture](/reviews/backend-architecture.md), [Usability](/reviews/usability.md).
* **Update**: Remediated same-day: telemetry endpoints admin-gated (SEC-001/002), datalab SSRF guard + redirect re-check (SEC-006), Dockerfile workspace members + `/readyz` restored (BE-001/003), chart data-table step alignment (UX-001), unknown run status rendered neutrally (UX-002), staleness banners (UX-003/US-008), repo-root-anchored stores (US-004), no OKF card on empty collections (US-005), corrected error-remedy strings (US-003).
* **Initialization**: Established the knowledge bundle (OKF v0.1) with [index](/index.md), platform concepts, dataset card scaffolding, and the reviews section.
* **Creation**: Documented the [data collection pipeline](/platform/data-pipeline.md), [experiment tracking](/platform/experiment-tracking.md), [training console](/platform/training-console.md), and [telemetry API](/platform/core-api-telemetry.md).

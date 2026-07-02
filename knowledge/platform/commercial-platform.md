---
type: Site
title: Commercial Platform (hub commerce)
description: Buyer-facing surface on bhenre.com — pricing, contact briefings with lead capture, open-source Medusa-backed store (Shopify optional), legal pages.
resource: /apps/sites/hub
tags: [commerce, hub, medusa, shopify, site]
timestamp: 2026-07-02T00:00:00Z
---

The user-facing commercial path on the Platform Console (bhenre.com),
built to close [e-commerce review](/reviews/ecommerce.md) EC-001 (no
commercial path). Voice: measured, evidence-backed — no fabricated
metrics, no synthetic urgency.

# Frontend

| Route | Purpose |
|-------|---------|
| `/pricing` | Three engagement shapes (Evaluation Sprint, Managed Embeddings, Enterprise) with per-tier contact CTAs |
| `/store` | Provider-backed self-serve products (Medusa default); honest "opening soon" state when unconfigured |
| `/contact` | Briefing form (name, email, company, topic, message) with success/error states; `?topic=` deep links from pricing |
| `/legal/terms`, `/legal/privacy` | Baseline legal pages, explicitly marked template-pending-counsel |

# Backend

| Route | Behavior |
|-------|----------|
| `POST /api/contact` | Validates + persists leads to `data/leads/leads.jsonl` (source of truth), best-effort forward to `CONTACT_WEBHOOK_URL` |
| `POST /api/checkout` | `variantId` → provider cart create → 303 redirect to hosted checkout |

Commerce is **provider-agnostic** (`lib/commerce.ts`, server-side only).
Default provider: **Medusa** — MIT-licensed, self-hosted headless
commerce (Store API v2: `/store/products`, `/store/carts`). Shopify
(`lib/shopify.ts`, Storefront API) remains a config option. Either way,
payment completes on a PCI-compliant gateway (Stripe/PayPal via Medusa;
Shopify Payments via Shopify) — card data never touches our servers.

# Configuration (Operator)

```
COMMERCE_PROVIDER=medusa                        # default; or "shopify"

# Medusa (open source, self-hosted — deploy next to core-api)
MEDUSA_BACKEND_URL=https://store.<domain>       # or http://localhost:9000
MEDUSA_PUBLISHABLE_KEY=pk_...
MEDUSA_REGION_ID=reg_...
MEDUSA_STOREFRONT_URL=<hosted storefront>       # optional checkout base

# Shopify (only when COMMERCE_PROVIDER=shopify)
SHOPIFY_STORE_DOMAIN=<store>.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=<storefront token>
SHOPIFY_API_VERSION=2025-01                     # optional

CONTACT_WEBHOOK_URL=<slack/zapier url>          # optional
LEADS_DIR=<override lead storage>               # optional; Vercel needs a durable target
```

Unset provider vars → the store renders its unconfigured state; the rest
of the commercial path (pricing, contact, legal) works standalone.

# Medusa self-hosting sketch

Medusa is a Node service + Postgres (can share the Neon instance with its
own database). Minimal path: `npx create-medusa-app@latest`, deploy the
backend to Railway alongside core-api, create products + a region in
Medusa Admin, generate a publishable key, install the Stripe payment
provider, and point the env vars above at it.

# Watchlist

* On Vercel, `data/leads/` is ephemeral — set `LEADS_DIR` to a mounted
  path or replace persistence with a core-api endpoint before launch.
* Products/prices are authored in Shopify Admin; nothing is hardcoded.
* Remaining e-commerce findings (evidence-labeled leaderboards, SEO
  basics) tracked in [the e-commerce review](/reviews/ecommerce.md).

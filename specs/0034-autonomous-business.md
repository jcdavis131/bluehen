# Spec 0034 — The autonomous business: zero-involvement revenue

**Status:** Active (Operator mandate 2026-07-05: "does not need my involvement at all")
**Supersedes emphasis of:** 0030 §1 (consulting demoted from lead to optional add-on)
**Owner:** Claude (everything below the identity line) · Operator (ONE identity action, documented §5)

## 1. The re-thought offering

Sell only what fulfills itself:

| Product | Price (set per mandate) | Fulfillment (automated) |
|---|---|---|
| **API Free** | $0 — 1,000 metered calls/mo, 1 corpus (≤50 docs) | instant key at signup |
| **API Builder** | $29/mo — 50k calls, 3 corpora, auto-retrain | entitlement flips on payment webhook |
| **API Pro** | $99/mo — 500k calls, 10 corpora, priority queue | same |
| **Dataset access** | $49 one-time per dataset | existing entitlement grant, now webhook-driven |
| **Certification run** | $99/run | existing automated pipeline, payment-gated |

Consulting remains listed but is an add-on, not the business. Games
remain free (they're the data engine + top of funnel).

## 2. The unlock that matters most: self-serve signup

`POST /v1/signup {email?}` -> workspace + API key issued INSTANTLY on
the Free tier (caps enforced by the existing metering + budget
ceiling). No briefing, no human. Abuse rails: per-IP signup rate limit
(3/day), per-workspace hard caps, existing corpus/exhaust limits.
Email optional in v1 (no email-provider key exists — honest); used for
key recovery when a provider key lands.

## 3. Payments: provider-abstracted, open-source-first

`app/services/billing.py` defines ONE interface (create_checkout,
verify_webhook -> grant entitlement / flip tier). Two adapters:
- **BTCPay Server** (open source, self-hosted on Railway, no
  processor lock-in) — DEFAULT per Operator preference.
- Stripe (same interface, if ever preferred).
Until §5 happens, checkout endpoints return 503 with the honest line
"payments activate when the merchant identity is connected" — and the
Free tier grows usage meanwhile.

## 4. Autonomy requirements (all built or building)

Self-serve signup (§2) · automated fulfillment (webhook->entitlement)
· self-serve docs (/developers) · status transparency (existing honest
states) · support = docs + the games' feedback surfaces · pricing
published without human quoting · weekly BD digest keeps the Operator
informed, never involved.

## 5. The irreducible identity line (honest)

An agent cannot legally be the merchant of record or custody funds.
ONE Operator action activates revenue, ever:
- Path A (open source): create a BTCPay wallet (Operator custody);
  Claude hosts BTCPay on Railway and wires the adapter. ~15 min.
- Path B: create a Stripe account; paste one key. ~10 min.
Everything before and after that line is autonomous.

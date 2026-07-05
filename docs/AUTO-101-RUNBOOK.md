# AUTO-101 — the one action (runbook for tomorrow)

Everything else is live. Pick a path, ~15 min, revenue follows.

## Path A — Stripe (fastest)
1. stripe.com -> create account -> Developers -> API keys.
2. Hand Claude the secret key (test first is fine).
3. Claude then: adds STRIPE_SECRET_KEY to Railway, ships the Stripe
   adapter beside the BTCPay one (same billing interface), runs one
   test checkout -> entitlement grant verified -> flips paymentsLive.

## Path B — BTCPay (open source, your custody)
1. Create a BTC wallet you control; export the xpub.
2. Hand Claude the xpub + a hosting decision (self-host stack ~$10/mo
   VPS or a third-party BTCPay host).
3. Claude stands up BTCPay, creates the store, wires BTCPAY_URL /
   STORE_ID / API_KEY / WEBHOOK_SECRET, verifies an invoice round-trip.

## Already true while you sleep
- POST /v1/signup issues capped free keys (live, verified)
- /pricing publishes tiers; checkout returns the honest 503
- Games + wiki + funnel keep generating usage, labels, and SEO

# Blue Hen RE — Recommend Everything

**Out-of-the-box recommendation engines, trained on your data, that
improve themselves.**

Upload your documents through one API call; our loop trains a model
adapted to your domain, refuses to ship it unless it beats baselines on
measured gates, and serves recommendations that carry a reason on every
result. Your users' interactions stream back and retrain it — no data
team, no maintenance.

**Measured, not promised** (evidence ledger public, github.com/jcdavis131/bluehen):
- Domain-tuned models beat zero-shot BGE on **4 of 4** tenant corpora (+0.023–0.058 nDCG) — EVIDENCE §3.7
- Our deployed model beats the commercial zero-shot panel (BGE, E5, GTE, MiniLM) on hard real-text retrieval — §3.12, §3.15
- Corpus upload → trained → gated → deployed with **zero human steps**, proven in production — §3.14
- Models are ~3 MB per tenant; the whole serving stack runs in 1 GB — §3.9
- The eval gate **fails closed**: below-baseline models never deploy

**How you start:** `POST /v1/corpus` with your documents →
`POST /v1/recommend` with a query or an item id. Metadata contracts
keep your filters (price, category, date, location) type-safe.

**Contact:** bhenre.com/contact · Request a briefing: bhenre.com

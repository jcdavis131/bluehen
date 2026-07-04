# Positioning — competitive teardown & wedge (PMF-005)

> Research doc, not sales copy. Prices sourced 2026-07-04 from vendor pages
> unless flagged UNVERIFIED. Evidence citations = row numbers in
> [`EVIDENCE.md`](../EVIDENCE.md). Do not launder into customer-facing copy
> without re-verifying prices at time of use — they move.

**What we sell (for contrast):** corpus upload via API → loop trains a
tenant-specific head on a shared backbone → evaluation-gated deploy →
`/v1/recommend` with contract-validated filters → interaction exhaust
retrains it automatically. Claimed differentiators: (1) tenant-**adapted**
models, not one-size-fits-all embeddings, (2) self-improving loop, no data
team, (3) published evaluation gates + honest measured numbers, (4)
tiny-footprint economics (~3MB heads, 1GB serving).

---

## 1. Algolia Recommend

- **What:** Recommendation strategies (trending, related, frequently-bought,
  similar-items) computed over your existing Algolia search index +
  click/conversion events.
- **Price:** Usage-metered atop a search plan. Free Build tier (10K reqs/mo,
  1M records). Grow $0.50/1K extra search reqs; Grow Plus (AI ranking)
  $1.75/1K. Recommend itself: 10K reqs/mo included, then **$0.60/1K**.
  Elevate = custom annual. [Algolia](https://www.algolia.com/pricing)
- **Setup:** Low if already on Algolia search — config over an existing
  index, no modeling project, no training loop to run.
- **Ideal customer:** E-commerce/marketplace already paying for Algolia
  search wanting cross-sell shelves without a data science hire.
- **Where they beat us:** Zero ML-ops burden (config, not training); mature
  merchandising UI (facets, rules, A/B testing) we lack; 10+ year track
  record at massive query volume. If the need is generic cross-sell on an
  existing Algolia deployment, switching to us is pure cost for them.
- **Where we win:** "Similar items" is catalog-metadata similarity, not an
  embedding retrained on the tenant's own interaction exhaust — it doesn't
  get smarter about *this* tenant over time. No published rank/nDCG gate;
  you get results with no quality signal.
- **Wedge:** "Algolia re-ranks your index by generic signals — it doesn't
  learn your specific similarity. We train a dedicated retrieval head on
  your corpus and interactions, gated by a published quality number before
  it ships. If you just want shelves on Algolia search, stay; if
  recommendation *quality* on your domain is the point, that's us."

---

## 2. AWS Personalize

- **What:** Managed collaborative-filtering "recipes" (incl. V2) trained on
  your S3 interaction data; deployed as real-time or batch campaigns.
- **Price:** Fully unbundled per-primitive metering: ingestion $0.05/GB;
  training $0.24/hr (standard) or $0.002/1K interactions (V2); real-time
  inference $0.0556→$0.0139/1K by volume tier (V2 flat $0.15/1K); **minimum
  1 TPS billed even at zero traffic**. Free tier: 2 months, ~20GB + up to
  180K reqs. [AWS](https://aws.amazon.com/personalize/pricing/)
- **Setup:** Meaningful — design your own interaction schema, pick a
  recipe, run S3 pipelines, operate campaign scaling. IaaS-shaped, not a
  finished product; typically weeks of ML-literate engineering.
- **Ideal customer:** AWS-native org with in-house ML/data engineering that
  wants infra control and will assemble the pipeline itself.
- **Where they beat us:** Unlimited scale headroom, AWS operational
  maturity (VPC/IAM/compliance) we don't match yet; more recipe variety for
  teams that want to choose their own algorithm; no vendor lock — AWS-native
  infra they already trust.
- **Where we win:** No recipe-picking or schema design — corpus in,
  evaluated model out. Economics: ~3MB heads in a 1GB container vs.
  per-request/per-training-hour metering that bills a minimum at idle. We
  publish the eval gate the model cleared; Personalize hands you a model,
  not a graded one.
- **Wedge:** "Personalize is excellent infra if you want to build your own
  pipeline — but it's infra, and it bills idle capacity. We skip schema
  design and recipe choice: upload a corpus, get an evaluation-gated model,
  serving from a footprint two orders of magnitude smaller. Want control,
  use AWS; want the outcome without hiring the team, that's us."

---

## 3. Shaped.ai

- **What:** Closest positioning match — connect a warehouse, it trains and
  serves ranking models; markets itself as a "real-time context engine" for
  search/recs/agentic ranking.
- **Price:** Free Starter ($100 credit). Standard (production) has a
  **$500/mo minimum**; usage: storage $0.20/GB, enrichment $2/M tokens,
  reads $0.45/K, writes $0.012/K, training/encoding $6/hr. Enterprise =
  custom. [Shaped](https://www.shaped.ai/pricing)
- **Setup:** Low-medium — CLI connectors to warehouses/app stores; claims
  data-to-prod in 7 days. Self-serve caps at 5 engines/tables and
  **pre-trained embeddings only**; real-time ingestion + advanced ranking
  are enterprise-gated.
- **Ideal customer:** Series A-C product/eng teams (e-com, social, media,
  marketplaces) wanting managed ranking infra without an ML research group,
  able to absorb the $500+/mo floor.
- **Where they beat us:** Real-time ingestion, a broader connector library,
  an "agentic context engine" angle we haven't built; faster advertised
  time-to-first-model and more polished self-serve tooling today.
- **Where we win:** Self-serve Shaped ranks on top of **pre-trained**
  embeddings — adaptation happens in the ranker, not the embedding itself;
  per-tenant embedding fine-tuning is an enterprise conversation for them.
  That's our default tier: every tenant gets a trained head, not a shared
  embedding with a ranker glued on. Our published gates (rank floor, nDCG
  non-regression, minimum real eval pairs) are a harder bar than anything in
  their public docs.
- **Wedge:** "Shaped's self-serve tier ranks on pre-trained embeddings —
  the embedding itself isn't adapted to you unless you're an enterprise
  deal. We train a tenant-specific embedding head by default, on every
  plan, gated by a published quality threshold before it serves traffic. If
  real-time warehouse ingestion at scale is the priority today, they're
  ahead; if the embedding needs to understand your domain, ours is adapted
  from dollar one."

---

## 4. Voyage AI / Cohere embeddings (category)

- **What:** Not a recommendation product — commercial embedding APIs. Call
  an endpoint, get a general-purpose vector, build retrieval/recommendation
  yourself. Voyage (voyage-4/-4-lite/-context-3), Cohere (embed-v3/v4).
- **Price:** Voyage ~$0.02/M tokens (lite) to $0.18/M (large); first 200M
  tokens free/account; batch ~33% off. [Voyage](https://docs.voyageai.com/docs/pricing)
  Cohere embed-english-v3 ~$0.10/M, light ~$0.02/M, with dimension
  compression (1024→256) for storage savings. **Cohere figures UNVERIFIED
  against cohere.com directly this pass** — sourced from aggregators;
  re-verify before quoting.
- **Setup:** High — still need a vector store, retrieval logic, a
  fine-tuning story if you want domain adaptation (a separate paid add-on
  for both vendors, not default), an eval harness, a retrain pipeline. A
  component, not a solution.
- **Ideal customer:** Eng teams building bespoke RAG/search who want
  best-in-class general embeddings and will own the retrieval stack, eval,
  and retraining themselves.
- **Where they beat us:** Zero-shot quality is genuinely strong and
  improves with every model release at no retraining cost to you; simpler
  mental model (one API call), no platform lock-in; cheaper at very low
  volume before counting the engineering cost of the rest of the stack. Our
  own evidence: on saturated/easy corpora the domain-tuning gap narrows to
  near-zero (EVIDENCE.md §3.13 — trained 0.926–0.935 vs zero-shot
  0.917–0.926, "no method verdict claimable").
- **Where we win:** The stack around the embedding — training loop, eval
  gates, contract-validated filters, serving — is exactly what these
  vendors leave to you. Domain-tuned heads beat zero-shot BGE/e5/gte on
  **4/4 tenant corpora** (EVIDENCE.md §3.7, +0.023 to +0.058 nDCG); on
  hard-negative real-text slices the deployed model leads the entire
  zero-shot panel — bge-small, e5-small-v2, gte-small, raw MiniLM
  (EVIDENCE.md §3.12, +0.058 over bge-small).
- **Wedge:** "Voyage and Cohere sell a very good generic vector and leave
  the stack around it to your team. We measured it directly: a domain-tuned
  head beats the zero-shot commercial panel — bge-small, e5 included — on
  every tenant corpus tested, by 0.02–0.06 nDCG. Want a component and have
  the team to build the rest? Call Voyage. Want the whole loop already
  gated and serving? That's us."

---

## 5. DIY pgvector + OpenAI embeddings

- **What:** The default "just build it" path — Postgres + pgvector, OpenAI
  `text-embedding-3-small`/`large`, hand-rolled retrieval/reranking.
- **Price:** Cheapest sticker price here. `text-embedding-3-small`:
  **$0.02/M tokens** standard, $0.01/M batch (100K docs ≈ 50M tokens ≈
  $1.00/$0.50 to index). [OpenAI](https://developers.openai.com/api/docs/models/text-embedding-3-small)
  pgvector is free (self-hosted Postgres cost only). Real cost is
  engineering time: chunking, index tuning, eval harness, retrain cadence,
  filter schema — all headcount, none of it a line item.
- **Setup:** Highest of the five — no managed loop, no eval gates, no
  serving layer; every piece built and maintained in-house. Our own
  chunking ablation shows this is nontrivial before modeling even starts:
  chunk size alone swings nDCG 0.870→1.000 and effective rank 15.6→27.3 by
  token length (EVIDENCE.md §3.11) — a tuning surface DIY teams discover
  the hard way.
- **Ideal customer:** Teams with existing ML/platform capacity, low query
  volume, or compliance/data-residency needs requiring full stack control;
  also prototypers before committing spend.
- **Where they beat us:** Total control, no vendor, no lock-in, cheapest
  raw compute at small scale. If the team already exists (sunk headcount)
  and volume is low, DIY can be cheaper in dollars, if not in time.
- **Where we win:** Everything DIY must build is what we ship: a fail-closed
  eval harness (REV-905 rejects deploys under 8 real eval pairs rather than
  silently substituting demo data, EVIDENCE.md §2), chunking already tuned
  per corpus, automatic retraining on interaction exhaust, and a serving
  footprint (~3MB head over a shared backbone) a DIY team spends real weeks
  matching. The honest pitch is time-to-value and operational discipline,
  not per-token cost.
- **Wedge:** "DIY pgvector + OpenAI is cheapest by sticker price, and if you
  have a platform team with spare capacity, build it. But every gate we
  ship — tuned chunking, fail-closed evaluation, automatic retraining — is
  weeks your team will spend discovering and maintaining. We sell the
  finished version of what your best engineer would eventually build."

---

## Summary table

| Vendor | Price shape | Setup burden | Tenant-adapted embedding? | Published eval gate? | Ideal customer |
|---|---|---|---|---|---|
| Algolia Recommend | $0.60/1K reqs on top of search plan | Low (config) | No — catalog similarity | No | E-com already on Algolia search |
| AWS Personalize | Unbundled per-primitive, idle-billed | High (build the pipeline) | Per-recipe, self-managed | No | AWS-native team w/ ML eng |
| Shaped.ai | Usage + $500/mo floor | Low-medium (managed, 7-day claim) | Self-serve = pre-trained only; adapted embedding is enterprise-gated | Not published | Series A-C team, no ML research group |
| Voyage/Cohere embeddings | $0.02–$0.18/M tokens, component only | High (build retrieval+eval+retrain) | No (zero-shot general vector) | No | Eng team owning a bespoke RAG stack |
| DIY pgvector+OpenAI | ~$0.02/M tokens + all eng time | Highest (build everything) | No (unless you build it) | No (unless you build it) | Platform team, spare capacity, low volume |
| **Blue Hen RE** | Not yet public — anchor pricing pending | Low (upload corpus, API) | **Yes, default on every tenant** | **Yes — fail-closed, published** | Teams wanting adapted retrieval, no data/ML team |

---

## The 5 claims we can make TODAY (evidence-backed)

1. **Domain-tuned heads beat zero-shot commercial embeddings on tenant
   corpora, 4 for 4 measured.** EVIDENCE.md §3.7 — beat BGE zero-shot on
   all four fleet sites tested (+0.023 to +0.058 nDCG).
2. **On real text with hard negatives, our deployed model beats the
   entire commercial zero-shot panel** (bge-small, e5-small-v2, gte-small,
   raw MiniLM) on the identical slice. EVIDENCE.md §3.12 — +0.058 over
   bge-small, +0.035 over its own backbone.
3. **Serving footprint is genuinely tiny: a ~3.2MB trained head over a
   shared backbone, in a 1GB container.** EVIDENCE.md §3.9 — first
   chartered prod deploy, nDCG 0.9077 / effective rank 26.03 measured on
   the served representation.
4. **Our evaluation gate fails closed, not open.** EVIDENCE.md §2
   (REV-905) — the eval service now rejects promotion below 8 real
   collection pairs; the prior silent demo-pair fallback (passable on 3
   hard-coded pairs) was removed. None of the five competitors above
   publish evidence of an equivalent gate.
5. **Zero-touch pipeline is real: corpus upload to charter-approved
   deploy, no human step between.** EVIDENCE.md §3.14 (RECO-001) — POST
   /v1/corpus → training job → gates=True → charter-approved deploy, one
   API call. (Same-day correction logged: a siteless-upload policy bug
   was caught and fixed — the guardrail working under a real failure is
   itself part of the honest evidence trail.)

## Claims that need the anchor case study first

- **Cross-domain generality beyond text corpora** (Spec 0023 Blueprint
  3's "if the box handles it, X is easy" pitch) — ANCHOR-001 not yet
  provisioned; nothing to cite until real tenant data runs the loop.
- **Head-to-head win against a paying customer's current production
  vendor** — all wins above are our own tenant corpora vs. zero-shot
  baselines we ran ourselves; no third-party/customer-supplied benchmark.
- **Retention/lift on live interaction exhaust** — the loop runs
  end-to-end (RECO-001) but no tenant has enough real interaction volume
  yet to show automatic retraining lifting a live business metric.
- **Cost/economics vs. a named competitor at a specific volume** — we
  have our own footprint numbers (§3.9) but no modeled "cheaper than
  Shaped/Personalize at N reqs/month" comparison at a real tenant's load.
- **Method-level differentiation beyond domain tuning itself** (e.g.
  barlow > generic contrastive fine-tuning) is measured internally
  (EVIDENCE.md §3.12, §3.15) but not validated against what a competent
  DIY/Shaped customer would achieve with their own tuning — RT-403
  (promote barlow to default recipe) is still queued behind per-tenant
  gates.

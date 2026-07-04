# PMF-001 — ICP hypotheses v1 (2026-07-04)

**Purpose:** pick the primary segment for the first 10 discovery
interviews (PMF-002) and the outreach list (BD-004). Scored 1–5 per
axis; disqualifiers written down so we notice when we're wrong.
**Decision owner:** Operator. Claude's recommendation at the bottom.

## Segment A — Real-estate brokerages & teams (10–200 agents)

**The pain:** agents lose hours matching buyers to inventory by memory
and saved searches; portal search is keyword-dumb ("3BR Newark under
500k" misses the renovated 2BR+den priced right); past client
interactions (what they clicked, toured, rejected) inform nothing.
**What we'd sell:** a listings recommender trained on THEIR inventory +
interaction exhaust — "clients who toured this also…" + buyer-profile
matching, behind their existing site/CRM via API.

| Axis | Score | Why |
|---|---|---|
| Pain intensity | 4 | Matching IS the job; time-to-match ≈ commission |
| Budget authority | 3 | Broker-owner decides; tech budgets modest but real (they pay for portals/CRMs) |
| Data readiness | 4 | MLS feeds + site analytics exist; dense structured metadata (price/beds/geo) |
| Reachability | 5 | Operator's home turf (henington-homes network); warm intros |
| Proof leverage | 5 | ANCHOR-001 case study IS this segment |

**Disqualifiers to listen for:** MLS licensing restricts derived-data
use; portals (Zillow) already "good enough"; CRM lock-in makes API
integration a non-starter for small shops.

## Segment B — E-commerce SMBs (Shopify-tier, 1k–100k SKUs)

**The pain:** "similar items / you may also like" from platform apps is
generic co-occurrence; no in-house data team; the good stuff (Algolia
Recommend, Personalize) is priced/staffed for mid-market+.
**What we'd sell:** drop-in `/v1/recommend` on their catalog, improving
from their own click exhaust, at SMB pricing.

| Axis | Score | Why |
|---|---|---|
| Pain intensity | 3 | Real but diffuse; conversion lift is probabilistic, not workflow-blocking |
| Budget authority | 4 | Owner decides fast; used to $29–299/mo app pricing |
| Data readiness | 5 | Clean catalogs + event streams by default |
| Reachability | 2 | Crowded channel; no warm network; app-store SEO is a long game |
| Proof leverage | 3 | Needs an e-commerce case study we don't have yet |

**Disqualifiers:** platform app-store gatekeeping; expectation of
one-click install (our API-first flow needs a light plugin we haven't
built); Shopify's own AI recommendations improving underneath us.

## Segment C — SaaS docs/support teams (Series A–C)

**The pain:** support deflection and in-product search are bad; teams
buy Algolia and still hand-tune synonyms; docs change weekly.
**What we'd sell:** search+related-articles tuned to THEIR corpus,
retrained automatically as docs churn; certification receipts appeal to
eng buyers.

| Axis | Score | Why |
|---|---|---|
| Pain intensity | 3 | Annoying, budgeted, rarely urgent |
| Budget authority | 3 | Eng lead or support ops; procurement friction at this size |
| Data readiness | 5 | Markdown/HTML corpora; clean |
| Reachability | 3 | Findable (public docs sites) but cold |
| Proof leverage | 4 | Our own research-rag IS this use case (EVIDENCE 3.12/3.15) |

**Disqualifiers:** incumbent Algolia contracts; "we'll just use GPT +
RAG" reflex (the Qodo-lesson lane we chose not to fight in).

## Recommendation

**Primary: Segment A (real estate).** Highest combined score, the only
segment with warm reach, and the anchor-tenant case study doubles as its
sales asset — strategy compounds instead of splitting. **Secondary: C
(SaaS docs)** — our own product is the standing demo, and certification
resonates with eng buyers; use it to test whether eval-receipts are a
wedge on cold outreach.
Park B until a plugin exists and one case study is public.

**Interview quota (PMF-002):** 7 × Segment A, 3 × Segment C.

*Revise this doc after interviews 5 and 10 — scores are hypotheses,
not findings.*

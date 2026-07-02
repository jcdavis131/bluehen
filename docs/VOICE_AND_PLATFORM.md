# Voice & Platform — Blue Hen RE (B2B)

**Positioning:** Enterprise embedding operations platform — governed lifecycle, measurable validation, production serving.

**RE — dual meaning (pair in customer-facing copy):**

| Layer | Expansion | When to use |
|---|---|---|
| **Relay Engine** | Organizational platform | Console, sales, onboarding |
| **RAG Embeddings** | Technical product | API, whitepaper, engineering |

> Blue Hen **RE** = **R**elay **E**ngine for cross-team handoffs, **R**AG **E**mbeddings in production.

---

## The Operating Loop (five divisions)

| Division | Id | Delivers |
|---|---|---|
| **Platform Orchestration** | orchestration | Priorities, budgets, gap routing |
| **Data Operations** | data | Curated corpora & training pairs |
| **Research & Development** | research | Recipes, evidence, candidates |
| **Validation & Charter** | bd | Benchmarks, pilots, production charter |
| **Production** | execution | Deploy, index, serve, metrics |

Code ids (`data`, `research`, `bd`, …) stay stable in API and specs. UI uses division names from `packages/fleet/src/narrative.ts`.

---

## Product surfaces (sites)

| Site | Surface | Domain |
|---|---|---|
| **hub** | Storefront | bhenre.com |
| **control** | Headquarters | jcamd.com |
| **dumbmodel** | Baseline Comparison | dumbmodel.com |
| **benchmark-lab** | Validation Lab | slasso.com |
| **research-rag** | Applied Research | arxiviq.com |
| **finance-lab** | Simulation Lab | Phase B |

---

## Glossary (customer-facing)

| Internal | Platform term |
|---|---|
| Ledger | **Operations Ledger** |
| Hill-climb | **Lifecycle Run** |
| BD queue | **Validation Queue** |
| Experiment museum | **Research Registry** |
| Live search | **Live Search** |
| Feedback | **Operations Feedback** |
| Deployed model | **Production Model** |
| EVIDENCE.md | **Evidence Records** |

---

## Brand voice (B2B)

- **Measured, not hype** — every claim ties to eval gates and evidence
- **Enterprise clarity** — division names, stage gates, charters (not sports metaphors)
- **dumbmodel.com exception** — may use lighter tone for baseline comparison; still evidence-backed
- **Tagline:** *Measure. Validate. Deploy. Improve.*

---

## Implementation

```typescript
import { BRAND, RE, GLOSSARY, getSiteNav, getSiteCircuit, stageLabel } from "@synthaembed/fleet";
```

See also: `docs/DESIGN_SYSTEM.md`, `specs/0012-synthetic-org-divisions-and-handoffs.md`.

**Supersedes:** sports/relay framing in earlier `VOICE_AND_CIRCUIT.md` drafts.

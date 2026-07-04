# Spec 0023 — The multi-tenant flywheel: horizontal intelligence layer

**Status:** Active (Operator vision, 2026-07-04)
**Refines:** Spec 0025 (engine) · 0019 (topology) · 0021 (monetization)
**Owner:** Claude (blueprints 1–2 machinery) · Operator (anchor-tenant data, naming gates)

## 1. The reframe

Blue Hen is not a vertical app — it is the **horizontal intelligence
layer**: plug-and-play SOTA recommendation / custom RAG / embedding
solutions for any domain. Verticals (starting with real estate) are
proving tenants, not the product.

## 2. Strategic roles (Operator's domain table, canonical)

| Domain | Role | Closed-loop contribution |
|---|---|---|
| Blue Hen (bhenre.com) | **The horizontal product** | Multi-domain interaction/retrieval exhaust tunes foundational alignment without violating tenant isolation |
| ArXivIQ | **The R&D pipeline** | Parses SOTA literature; feeds architectural shifts into the dev loop, eliminating manual research overhead |
| DumbModel | **The automated evaluator** | Quality gatekeeper: stress-tests every alignment/pipeline for drift + retrieval accuracy before it ships to clients |
| Jcamd | **The orchestration core** | Unified serving, multi-tenant isolation, passive billing, low-latency inference |

(slasso/refinery/signals remain BU surfaces per Spec 0019; their outputs
— certification, datasets, generality proofs — serve the roles above.)

## 3. Blueprint 1 — shared core embedding space + tenant adapters: **SHIPPED**

The production architecture already implements this exactly (it was
forced by the 1 GB container and then beat the commercial panel):
- ONE resident foundational backbone per process (`get_base_encoder`,
  prewarmed at boot) = the shared core embedding space.
- Per-tenant trained projection heads (~3 MB), stored in Postgres under
  RLS (`model_versions.artifact`), assembled at serve time via
  `HeadServingEncoder` — adapter isolation with zero cross-tenant
  weight sharing. Head ↔ LoRA equivalence noted; LoRA ranks become an
  autoresearch hypothesis (RD queue), not a rewrite.
- Cross-domain foundational fine-tuning (aggregate exhaust → improved
  BACKBONE) is the future step and is Operator-gated: it changes the
  shared space under every tenant, so it requires per-tenant
  non-regression gates fleet-wide before adoption.

## 4. Blueprint 2 — the automated R&D→deployment pipe

Target flow: ArXivIQ literature radar → parsed architectural claim →
logged hypothesis (AR queue item, auto-drafted) → autoresearch harness
tests it (existing KEEP/DISCARD) → DumbModel-lane eval vs live
benchmarks (existing gates + commercial-panel slice) → flagged for
gated deploy (existing charter machinery). Missing link = the FIRST
segment only: radar output → structured hypothesis → queue item.
Tasks: RDPIPE-001 (radar→hypothesis drafter, deterministic extraction +
GLM-gated summarization), RDPIPE-002 (CI hook: new AR item labeled
`auto` triggers a harness run on the local runner when idle).

## 5. Blueprint 3 — real estate as anchor tenant

henington-homes workflows become tenant zero for the horizontal promise:
dense, contextual, geo/financial relationships — if the box handles it,
e-commerce/legal/SaaS are easy. Needs: Operator-provided corpus
(listings/valuations/workflows) → RECO-001 upload path → the loop does
the rest. Task ANCHOR-001 (Operator data gate + tenant provisioning).

## 6. Priorities

RECO-001/002 (out-of-the-box product face) → RDPIPE-001 →
ANCHOR-001 (on data) → cross-domain foundational tuning (gated, last).

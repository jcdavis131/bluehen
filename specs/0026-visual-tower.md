# Spec 0026 — The visual tower: DINOv3 Visual Comps

**Status:** Active (Operator directive 2026-07-04)
**Refines:** Spec 0023 (MTNN blueprint, tower T4) · 0024 (filters) · 0025 (engine)
**Owner:** Claude (tower machinery, eval) · Cursor (product UI) · Operator (DINOv3 license + HF_TOKEN gate)

## 1. Product

**Visual Comps:** photo in → visually comparable, filter-legal items
out. Query: `POST /v1/recommend {"imageUrl"|"imageB64", "filters":{...}}`.
The photo embeds through a frozen DINO backbone; a trained projection
head (~3 MB, per tenant) maps it into the tenant's existing embedding
space; retrieval + metadata-contract filters do the rest. Flagship
demo: real-estate comps that actually look comparable (anchor tenant);
same API serves e-commerce "similar look."

## 2. Architecture (ImageBind pattern, our machinery)

- **Backbone:** frozen DINOv2-small (Apache-2.0) at launch; swaps to
  DINOv3 when the Operator accepts Meta's license (HF-gated) — same
  API, zero code change. Never fine-tuned.
- **Tower head:** projection MLP trained with the proven head-only
  Barlow method on photo↔text pairs (listing photos ↔ descriptions;
  product images ↔ titles) into the shared text-pivot space.
- **Pairs:** free from any visual catalog corpus; upload schema gains
  optional `imageUrl` per document (SSRF-guarded fetch, consent rules
  unchanged).
- **Serving:** CPU ok for query-time single images + small catalogs;
  bulk indexing gated on Modal GPU (MON-003). Image vectors live in
  document_chunks payload-side like everything else.

## 3. Gates (non-negotiable)

Eval: held-out photo → same-item retrieval (recall@k, nDCG@10) vs the
CLIP-zero-shot baseline AND text-only baseline on the same slice.
No measured win over both → no deploy. EVIDENCE row required before
any product claim.

## 4. Phases

- **V1 (TOWER-001):** offline proof — DINOv2-S + projection head on a
  paired image/text corpus; eval vs baselines; EVIDENCE row.
- **V2 (TOWER-002):** /v1/recommend image input + upload imageUrl
  ingestion; metered as `recommend-visual`.
- **V3 (TOWER-003, cursor):** product surface — photo-upload UI on the
  kit/demo pages + anchor-tenant comps page.
- **V4:** DINOv3 swap (Operator license gate) + Modal bulk indexing.

## 5. Non-goals

Fine-tuning vision backbones; generative imagery; face recognition or
person identification of any kind (excluded uses); video (later).

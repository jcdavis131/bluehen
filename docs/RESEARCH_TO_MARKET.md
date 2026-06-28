# Research → Business Development → Execution

How the autonomous org moves an embedding method from the lab to a customer. Every promotion
traces to a measured row in [`EVIDENCE.md`](../EVIDENCE.md) / [`SWEEP_FINDINGS.md`](../SWEEP_FINDINGS.md)
(891-run program, 2026-06-28). Marketing/product copy may only use **Measured** claims
(SCIENCE_REVIEW.md is normative).

```
Research org  ──promote measured wins──▶  Business Development  ──pilot succeeds──▶  Execution & Implementation
(tries methods, measures)                 (real-world pilots, ROI)                   (ships to production)
```

---

## 1. Research findings (what the lab established)

- **Anti-collapse is regime-specific.** Huge for non-contrastive/low-negative objectives, ~zero
  for InfoNCE with adequate negatives. So the production default needs no exotic anti-collapse.
- **The moat is domain adaptation + cheap serving**, not collapse-resistance. Domain fine-tune:
  +1.5–3% in-domain, no out-of-domain forgetting. int8 serving is free; truncation robustness
  comes from MRL training.
- **Best regularizer (if one is wanted): Barlow Twins** (> VICReg) — real-text confirmation in
  progress.
- **Rejected (archived):** weight-space spectral surgery (original ASN), spectral_lift, sleep/SHY
  phasic consolidation, DINO-centering. Kept honestly in the ledger as negative results.

---

## 2. Promotion to Business Development (pilot-worthy methods)

These are promoted for **real-world pilot testing** on tenant problems. Each has a measured basis,
a recommended pilot, and a go/no-go success criterion.

| Method | Basis (measured) | Recommended real-world pilot | Success criterion (go to Execution) |
|---|---|---|---|
| **Domain fine-tuning** (InfoNCE) | +1.5–3% in-domain, no forgetting (§3.6/§3.7) | Benchmark Lab (slasso.com) + a design-partner corpus: fine-tune a tenant model, compare retrieval vs their current stack | ≥ +3% nDCG@10 vs the tenant's incumbent on their eval, no OOD regression |
| **int8 + Matryoshka cheap serving** | int8 lossless; MRL = truncation lever (§3.7) | Same tenant: serve full-tier vs cheap-tier (truncated+int8) | < 1% nDCG loss at ≥4× smaller/faster vectors |
| **Barlow Twins** (regularizer option) | #1 of 6 in TPE search (§3.7); real-text *validating* | Apply on a low-label / few-negative tenant corpus where InfoNCE underperforms | beats plain InfoNCE on that corpus by a measured margin |

**BD's job:** run these on **fictional/paper or design-partner problems first** (per the v1
guardrail — analytics & simulation only, no live trading/money movement), quantify ROI, and
report back. A method only advances if it clears its criterion on a real corpus.

---

## 3. Execution & Implementation handoff (production recipe)

What ships once a pilot clears its gate. This is the default org-training + serving spec.

**Training recipe (per-tenant):**
```json
{
  "baseModel": "sentence-transformers/all-MiniLM-L6-v2",
  "epochs": 2,
  "batchSize": 64,
  "lr": 2e-5,
  "loss": { "method": "infonce", "infoNceTemp": 0.05 },
  "asn": { "enabled": false }
}
```
- Default: **InfoNCE**, batch ≥64, ASN weight-surgery **off** (rejected). For a cheap-serving
  tenant, set `"method": "mrl"` so truncated dims stay usable. For a low-negative corpus, try
  `"method": "barlow"`. VICReg (`vicregVar/vicregCov`) only where an ablation shows a gain.
- All selectable via `train_asn` recipe flags — no code change to switch method (EVIDENCE §3.7).

**Serving (two tiers, via `/v1/model/deploy`):**
- **Full tier:** `truncateDims: null, quant: null` — max quality.
- **Cheap edge tier:** `truncateDims: <MRL dim>, quant: "int8"` — renormalized truncation + int8
  (free). Implemented in the serving path (#3).

**Integration checklist:**
1. Provision tenant workspace (RLS-isolated — verified, `services/core-api/VERIFICATION_REPORT.md`).
2. Ingest → pairs → `train_asn` with the recipe above.
3. Eval gate: nDCG@10 non-regression vs incumbent + (cheap tier) < 1% truncation loss.
4. Deploy chosen tier; monitor per-tenant cost ceiling + drift.

---

## 4. Repositioned product thesis (#4)

**Before:** "collapse-resistant, better-than-commercial embeddings via the ASN method."
**After (measured):** **"Domain-adapted embeddings that beat general commercial models on your
data, served cheaply at the edge (int8 + Matryoshka)."**

- Collapse-resistance is demoted to a *researched safety property* for low-negative regimes
  (Barlow/VICReg available), not the headline.
- dumbmodel.com keeps the honest anti-hype framing, now backed by the 891-run ledger and the
  Research Lab page (research-rag) showing exactly what was tried, what worked, and what was
  archived. The credibility *is* the marketing.

> Open confirmations before external copy: real-text Barlow>VICReg (running) and a fair
> multi-domain zero-shot SOTA comparison (§3.7 step #2). Until then, "beats commercial" stays
> scoped to *in-domain* with the stated caveat.

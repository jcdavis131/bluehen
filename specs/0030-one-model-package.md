# Spec 0030 — One model, one package, services that print

**Status:** Active (Operator vision, 2026-07-04 late)
**Supersedes emphasis of:** 0021 (streams re-weighted) · **Refines:** 0025/0028/0029
**Owner:** Claude (model/package/harness) · Operator (name sign-off, HF_TOKEN, consulting price)

## 1. The strategy (honest core)

The embedding model is essential **by integration, not by benchmark**:
an instruction-adaptable small model (CPU-class, free to host) that the
entire package assumes — skills, harness configs, tuning loop, eval
baselines. The Instructor lesson: conventions make standards. Our
measured edge stays the tuning loop (EVIDENCE 3.7/3.12/3.15: tuned
small beats general big, in-domain, 4/4).

**What we sell** (sequenced for cash):
1. NOW — **setup consulting** (stand up the local stack: our model +
   GLM-class free LLMs + open harness + skills). Invoiced services; no
   payment-rails dependency.
2. RECURRING — **managed tuning** (their model compounds on their
   exhaust in our loop; leaving = abandoning compounded quality) +
   **re-certification subscription** (quarterly receipts as models churn).
3. FREE — the model + package (distribution, brand, conventions).

## 2. The model: BlueHen-Embed (name = Operator gate)

- Base: proven MiniLM-class backbone + our head architecture; ships
  with domain heads + adaptation via tuned heads (instruction-prefix
  conditioning MEASURED AND REJECTED at this scale — EVIDENCE 3.17;
  8/8 configs worse in-domain. No Instructor-style claims on the card).
- Published on HF w/ model card + eval receipts (MON-008 machinery
  ready; HF_TOKEN gate).
- Claim discipline: "SOTA" only per-domain with EVIDENCE rows; the
  card links the ledger.

## 3. The package: `bluehen-stack`

One-command local install: embedding server (CPU), harness (open-
sourced from our eval/tuning machinery), skills library, GLM-5.2-class
free-LLM wiring, quickstart corpora. Target: runs on a laptop, zero
cloud costs. (PKG-002 defines the repo cut from the monorepo.)

## 4. One demo site: dumbmodel.com IS it

Consolidation, not construction: /compare (ours vs bge/e5/gte live,
same slice, honest), /check (diagnosis), /arena (the game), /museum.
Site copy reframes: "the model demo site." Storefront sells the
services; arxiviq carries the research receipts. No new properties.

## 5. Queue re-pointing

PKG-001 model naming+card+publish (HF_TOKEN gate) · PKG-002 the stack
package repo · PKG-003 dumbmodel consolidation copy/nav · PKG-004
consulting offer page + engagement doc (price = Operator) · AR-510
instruction-conditioned heads experiment · MON re-weight: consulting
first, Stripe streams second.

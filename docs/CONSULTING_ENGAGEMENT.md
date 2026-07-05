# Consulting engagement package (PKG-004)

**Status:** Draft — pricing pending Operator sign-off
**Spec:** [`specs/0030-one-model-package.md`](../specs/0030-one-model-package.md) §1/§3
**Related:** [`docs/POSITIONING.md`](POSITIONING.md) · [`docs/exports/onepager-platform.md`](exports/onepager-platform.md) · [`EVIDENCE.md`](../EVIDENCE.md)
**Owner:** Claude (draft) · Operator (price, name, final sign-off)

This is the internal scope document for the setup-consulting offer described
in Spec 0030 §1 item 1 ("NOW — setup consulting"). It is the source of truth
for what we sell, what we deliver, and what we explicitly do not. The public
page at `/services` on the storefront is customer-language copy derived from
this doc — keep them in sync when either changes.

---

## 1. The offer

We stand up the local AI stack (`bluehen-stack`, Spec 0030 §3) on the
customer's own infrastructure: our embedding model, the tuning loop, the open
eval harness, the skills library, and free-LLM wiring (GLM-class models) so
the whole thing runs without a per-token API bill. This is a **setup
engagement**, not a subscription — we install, tune one domain model, and
hand it over with a report card and a walkthrough. What happens after the
handover is a separate, optional conversation (§6).

The strategic reason this is first in sequence (Spec 0030 §1): it is
invoiced services, with no payment-rails dependency, and it gets a real
tenant corpus into the loop — which is also how the managed-tuning and
re-certification offers get proven out later.

**What makes the model worth integrating**, stated honestly: it is not a
benchmark leader in isolation. It is a CPU-class, free-to-host embedding
model that the rest of the package assumes (skills, harness configs, tuning
loop, eval baselines) — the "conventions make standards" bet from Spec 0030
§1. The measured edge is the tuning loop: a domain-tuned head beats
zero-shot commercial embeddings on the customer's own corpus, not in the
abstract (see Evidence, below).

---

## 2. Evidence we can cite (honest, sourced to EVIDENCE.md)

Only these rows are usable in this engagement's proposals and report cards.
Do not extrapolate beyond what each row actually measured.

- **EVIDENCE §3.7** — domain-tuned InfoNCE beat zero-shot BGE on **4 of 4**
  fleet tenant corpora tested (+0.023 to +0.058 nDCG@10). Caveat: small
  corpora, pairwise k=2 proxy metric — not a cross-domain MTEB claim.
- **EVIDENCE §3.12** — on a same-slice hard-negative real-text panel, our
  deployed domain-tuned model (barlow recipe) beat the entire zero-shot
  commercial panel it was compared against — bge-small, e5-small-v2,
  gte-small, and raw MiniLM — by +0.058 over bge-small and +0.035 over its
  own untuned backbone. This is the strongest available claim for "why tune
  at all": confusable/hard negatives are where tuning pays off.
- **EVIDENCE §3.14** — a corpus upload can go from `POST /v1/corpus` to a
  trained, gate-passed, charter-approved deploy with **zero human steps** in
  between, demonstrated on prod with 40 real documents. Relevant to the
  "does the loop actually run unattended after we leave" question — it does,
  on our infra; the on-prem package replicates the same pipeline logic
  locally.
- **EVIDENCE §3.15** — a harder pooled-negative protocol (16 seeded hard
  negatives) confirms trained heads beat commercial zero-shot embeddings
  in-domain (0.841–0.851 vs BGE 0.784, e5 0.776), while also showing an
  honest null: no method (barlow/infonce/vicreg/mrl) separates from the
  others beyond seed noise at this scale. Use this to set expectations — we
  do not promise a specific fine-tuning *method* will beat another; we
  promise domain tuning beats zero-shot.

**Do not cite:** the eval-harness deploy gates (`rankAboveBaseline`,
`ndcgNonRegression`) are still `Hypothesis` status per EVIDENCE §2 —
mechanically enforced (fail-closed) but not yet a "our gate proves X"
claim. Do not invoke ASN/spectral-surgery language in any customer-facing
material — rejected 0/4 per EVIDENCE §5 and explicitly barred by
`.claude/CLAUDE.md`.

---

## 3. Deliverables

1. **Working local install.** `bluehen-stack` running on the customer's
   chosen machine: embedding server (CPU), the open harness, the skills
   library, quickstart corpora, and GLM-class free-LLM wiring configured
   against their environment.
2. **One tuned domain model, with a report card.** We take one corpus they
   provide, run it through the tuning loop, and hand over the resulting
   model plus a report card: the gates it passed/failed, its nDCG/effective
   rank numbers, and an honest zero-shot-vs-tuned comparison on their own
   data (methodology per EVIDENCE §3.7/§3.12 — same protocol, their corpus).
   If the tuned model does not beat zero-shot on their data, the report card
   says so; we do not ship a favorable number that isn't real.
3. **Team walkthrough session.** A live session with their technical
   contact(s): how the install works, how to re-run the tuning loop on a new
   corpus, how to read the report card and the eval gates, and where the
   skills library and harness configs live.
4. **30-day support window.** Direct access to us for setup issues, install
   questions, and clarifying the walkthrough — bug-fix and Q&A support, not
   a managed-service SLA (see Out of scope, §5).

---

## 4. Timeline — 2-week standard engagement

| Week | Activities |
|---|---|
| **Week 1** | Kickoff call. Confirm infra target (their box) and technical contact. Corpus access established. Install `bluehen-stack` on their machine; verify embedding server + harness + GLM-class LLM wiring run end-to-end on a smoke corpus. |
| **Week 2** | Run the tuning loop on their real corpus; produce the report card (gates, nDCG/rank, zero-shot-vs-tuned comparison). Team walkthrough session. Handover: install docs, report card, support-window terms start. |

A rush timeline (compressed, e.g. one week) is available as a separate
pricing line — same deliverables, tighter sequencing, contingent on the
customer having corpus access and a technical contact ready on day one.

---

## 5. What we need from them

- **Corpus access.** Whatever documents/items they want the first tuned
  model built on — format flexibility (the harness converts common formats;
  see Out of scope for the line on data cleaning).
- **A technical contact.** Someone who can operate the install, sit through
  the walkthrough, and own the stack after the 30-day window — this is a
  handover engagement, not a managed one.
- **Infrastructure: any Linux box or laptop-class machine.** No GPU
  requirement, no cloud account requirement. This is the honest headline of
  the package (Spec 0030 §3): the target is a laptop running the whole
  stack at **zero cloud cost**. If they want to run it on cloud infra
  instead (their account, their bill), that's fine too — we install where
  they point us.

---

## 6. Out of scope

- **Custom application development.** We install and tune the stack; we do
  not build customer-facing apps, integrations beyond the documented
  `/v1/recommend`-equivalent local API, or bespoke UI on top of it.
- **Data cleaning beyond format conversion.** The harness handles common
  format conversion (e.g. PDF/HTML/markdown into training pairs). Content
  cleanup, deduplication, PII scrubbing, or corpus curation is the
  customer's responsibility unless scoped as a separate add-on.
- **SLAs and uptime guarantees.** The 30-day support window is Q&A and
  bug-fix support for the setup itself, not an operational SLA. Ongoing
  operational guarantees are the managed tier (§7).

---

## 7. Pricing

Standard engagement (2 weeks): **[Operator: price]**

Rush engagement (compressed timeline): **[Operator: price]**

Pricing is intentionally left open here pending Operator sign-off — do not
publish a number anywhere (proposals, the storefront page, or verbal quotes)
until this section is filled in. See `specs/0030-one-model-package.md`
owner line: "consulting price" is an explicit Operator gate.

---

## 8. Follow-on paths

The setup engagement is the entry point; three paths follow it, none
obligatory:

1. **Managed tuning subscription.** Their model keeps compounding on their
   own interaction exhaust inside our tuning loop, running on our
   infrastructure instead of theirs — leaving after this point means
   abandoning quality that has already compounded, which is the intended
   retention mechanic per Spec 0030 §1 item 2.
2. **Re-certification, quarterly.** As embedding/tuning methods evolve (see
   the honest method-churn record in EVIDENCE — barlow promoted over infonce
   in §3.12, mrl closed out in §3.15), a quarterly re-certification pass
   re-tunes and re-gates their model against current baselines. Structured
   as a recurring receipt, not a one-time engagement.
3. **Design-partner conversion.** If the corpus and usage profile fit the
   design-partner criteria (see `apps/sites/storefront/app/design-partners`
   — real corpus, real interaction volume), convert the engagement into a
   design-partner slot: free custom recommender work in exchange for
   case-study rights and biweekly feedback.

None of these are sold or priced in this engagement — they are named here so
the walkthrough session (§3) can mention them as what comes next, without
committing to terms the Operator hasn't set.

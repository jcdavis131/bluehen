# 0021 — Cert-driven research loop: cert failure → research ticket → gate → registry publish

- **Status:** Draft (awaiting Operator sign-off on the 90-day priority policy)
- **Owner:** Operator (policy) · Claude (research intake + tickets) · Cursor (cert fulfillment surfaces)
- **Refines:** 0012 (closed loop — makes the business case for it) · 0020 (monetization — P4 automated certification, A1/A2 active streams)
- **Related specs:** 0005 (auto-research conductor) · 0008 (eval harness & gates) · 0015 (venture fleet)

## Problem

The technical closed loop (Spec 0012) is implemented, but research input selection is
**opportunistic**: autoresearch tickets (AR-3xx) come from an internally curated delegate
queue, not from anything a customer failed at. That risks the two failure modes of the
business:

1. **Research forever** — beautiful lab, no buyers. Sweeps and new loss functions with no
   revenue linkage.
2. **Services without moat** — a cert/checklist anyone could run with off-the-shelf eval
   scripts, competing on price instead of science.

The winning path is **research-backed services**: certification (health checks, Spec 0020
P4/A1) is the door; research is the depth; deploy-gated models are the prize once gates
pass. That requires a normative rule connecting the two: every paid or free certification
that surfaces a failing slice must be able to become a research ticket, and research
spend should flow toward those tickets first.

## Goals

- Define the **business operating loop**: cert/health-check failure → research ticket →
  hill-climb on that slice → eval gate → registry publish → cert re-run / upgrade offer.
- Set the **90-day priority policy** (through 2026-10-01): autoresearch is
  **customer-driven** — new AR-* tickets must cite a cert/health-check failure slice
  (`source.certId`), with Operator override as the only exception.
- Define the **research ticket contract** so intake is mechanical, not judgment-per-case.
- Make every publish on the Research Registry (arxiviq) traceable to the failure it fixed
  — the "our research fixed a real production slice" story that sells the next cert.

## Non-goals

- Stopping or dismantling existing autoresearch infrastructure (conductor, hill-climb,
  delegate queue mechanics stay as-is; only **input selection** changes).
- New sweep grids or exploratory arms during the policy window (500× grids remain out of
  scope per `program.md`).
- The cert fulfillment product itself — self-service submission, scorecards, badges, and
  billing are Spec 0020 (MON-006); this spec consumes their output.
- Duplicating Eve's hill-climb orchestration — cert failures become the **input queue** to
  the existing loop, not a parallel loop.

## Design

### The loop (normative order)

```
1. CERT / HEALTH CHECK   slasso cert or free health check runs eval-harness on the
   (BD org)              customer corpus/endpoint → scorecard with per-slice results
        │  failing slice(s)
        ▼
2. RESEARCH TICKET       BD (or Operator) opens AR-* ticket in config/work_queue.json
   (BD → Research)       with a `source` block citing the cert + slice
        │  claim via pick_task.py
        ▼
3. HILL-CLIMB            Claude/conductor trains against the weakest slice; honest
   (Research org)        results to EVIDENCE.md; ledger stages train | eval
        │  eval gates pass (Spec 0008)
        ▼
4. GATE + BD QUEUE       Candidate submitted to content/fleet/bd/queue.json with
   (Research → BD)       evidenceRef pointing at both EVIDENCE.md and the origin cert
        │  pilot + charter (Spec 0012 Phase A+)
        ▼
5. REGISTRY PUBLISH      Method + dated evidence published on the Research Registry
   (Research org)        (arxiviq), linking the origin failure → the fix
        │
        ▼
6. RE-CERT / UPSELL      Customer's cert re-runs (or upgrade path offered: our
   (BD org)              checkpoint on their corpus) → next cert surfaces next slice
```

Steps 3–5 are the existing Spec 0012 loop. This spec adds steps 1–2 and 6 and the rule
that step 2 is the **only** sanctioned entry point for new research tickets during the
policy window.

### 90-day priority policy (normative, 2026-07-03 → 2026-10-01)

1. New AR-* tickets MUST carry a `source` block citing a cert/health-check failure
   (see Contract). Tickets without one are rejected at claim time by convention.
2. **Operator override**: the Operator may open a non-cert-sourced ticket by setting
   `source.override: "operator"` with a one-line rationale. This is the escape hatch for
   genuinely strategic research (e.g., a literature-radar finding worth a bake-off).
3. Already-open AR tickets (AR-301…310) are grandfathered; finish or close them, don't
   extend them.
4. Until paid certs exist, **dumbmodel free health checks and internal fleet-site
   health checks count as cert sources** — the loop runs on real corpora from day one
   and switches to paying customers as they arrive.
5. At policy end (2026-10-01), the Operator reviews: tickets opened, gates passed,
   registry publishes, and certs influenced — then renews, loosens, or tightens.

### What this changes for each agent

| Agent | Before | After |
|---|---|---|
| Claude | Works the delegate queue (`.claude/autoresearch-delegate.md`) | Works cert-sourced AR tickets first; delegate queue only via Operator override |
| Cursor | Ships wedge + sites | Additionally: cert/health-check surfaces emit per-slice failures in scorecard JSON (already the eval-harness shape) |
| Eve | Picks weakest slice from production metrics | Cert failures join production metrics as weakness signals (same data-gap ticket path, Spec 0012 §2 step 8) |

## Contract

### Research ticket (work-queue entry)

New AR-* entries in `config/work_queue.json` gain a required `source` block:

```json
{
  "id": "AR-311",
  "division": "research",
  "lane": "claude",
  "priority": "P1",
  "status": "ready",
  "spec": "0021",
  "title": "<slice> underperforms gate on <corpus> — recipe search",
  "source": {
    "kind": "cert",
    "certId": "cert_abc | healthcheck_xyz | fleet:<siteId>",
    "siteId": "validation",
    "failedSlice": "multi-hop-rag",
    "gateMetric": "ndcg@10",
    "gateValue": 0.41,
    "gateThreshold": 0.55,
    "scorecardRef": "content/fleet/bd/scorecards/<siteId>/<file>.json"
  }
}
```

Operator override variant: `"source": { "kind": "override", "override": "operator",
"rationale": "<one line>" }`.

### BD queue candidate (extension)

Candidates in `content/fleet/bd/queue.json` that originate from a cert-sourced ticket
add `"originCert": "<certId>"` and `"originTicket": "AR-311"` next to `evidenceRef`, so
the pilot/charter trail reaches back to the customer failure.

### Registry publish (extension)

Registry entries on arxiviq include the origin: *"Motivated by <slice> failure in
<cert/health-check>, <date>; fixed recipe passed gate <metric ≥ threshold> on
<date>."* No customer-identifying data — slice + corpus type only.

## Data model

No new tables. `config/work_queue.json` and `content/fleet/bd/queue.json` gain the
optional fields above (both are schemaless JSON). If Spec 0020 MON-006 ships the
`certifications` table, `source.certId` references `certifications.id`.

## Acceptance criteria

1. Given a scorecard with a failing slice, when BD opens a research ticket, then the
   ticket validates against the `source` contract and appears in `pick_task.py list`.
2. Given the policy window is active, when a new AR ticket lacks a `source` block, then
   it is not claimable by convention (documented in `.claude/CLAUDE.md` lane rules) —
   enforcement is social/review in v1, mechanical (pick_task.py check) if violations occur.
3. Given a cert-sourced ticket passes eval gates, when the candidate lands in the BD
   queue, then it carries `originCert` + `originTicket`.
4. Given a charter is issued for a cert-sourced candidate, when the method is published
   on the Research Registry, then the entry names the origin failure and gate result
   with dates.
5. Given the 90-day window ends, then a review note exists (HANDOFF.md or a ledger
   entry) counting tickets opened / gates passed / publishes / certs influenced.

## Test plan

- `scripts/tests/test_pick_task_source.py` (if mechanical enforcement lands): AR ticket
  without `source` is rejected during the policy window; override variant accepted.
- Manual v1: BD-703 walks one synthetic failure (dumbmodel health-check slice) through
  ticket → hill-climb → gate → BD queue → registry entry as the acceptance run.

## Evaluation gate (ML specs only)

Unchanged from Spec 0008 — this spec adds no new metrics. The existing promotion gates
(synthetic robust score, real-text ΔnDCG, OOD regression) remain the pass/fail authority
for step 4. A cert-sourced ticket that fails gates is an honest DISCARD, logged like any
other; the origin cert simply keeps its "no fix yet" status.

## Rollout & rollback

- **Rollout:** merge spec (Draft) → Operator signs off policy → status Ready → BD-703
  runs the first end-to-end pass manually. No flags, no migrations.
- **Rollback:** Operator declares the policy ended; AR tickets revert to the delegate
  queue. The `source` field stays harmless in historical entries.

## Risks

- **No cert volume yet** → loop starves. Mitigation: policy rule 4 — free health checks
  and internal fleet corpora count as sources until paid certs arrive.
- **Customer-driven becomes customer-only** — strategic research (literature radar,
  new-architecture bets) dies. Mitigation: Operator override is cheap and logged, not
  forbidden.
- **Slice leakage** — publishing origin failures could expose customer data. Mitigation:
  registry entries name slice type + corpus category only; scorecard refs stay in-repo.
- **Enforcement theater** — the `source` rule is ignored under deadline pressure.
  Mitigation: acceptance criterion 2 escalates to a mechanical pick_task.py check on
  first violation.

# Source documents — traceability map

Blue Hen RE synthesizes three design threads (`PLAN.md` §1). **In-repo markdown is canonical**
for CI and specs. Authoring originals live in Google Docs; archived exports in
[`docs/sources/`](./sources/).

## Archived exports (2026-06-27)

| File | Google Doc | Canonical repo target | Role |
|---|---|---|---|
| [`01-asn-educational-module.md`](./sources/01-asn-educational-module.md) | [Doc 1](https://docs.google.com/document/d/1IN2CBSPX3u46zamPljzcOGOeXMM6V54d9FNZ6QmEeqQ/edit) | [`WHITEPAPER.md`](../WHITEPAPER.md) | ASN method — popular/educational framing |
| [`02-synthaembed-enterprise-platform.md`](./sources/02-synthaembed-enterprise-platform.md) | [Doc 2](https://docs.google.com/document/d/1yLCSROVTfqjZpdVz7vqf3yuN_HbMo7GjdY1_XO7Q7-Q/edit) | [`PLAN.md`](../PLAN.md), specs `0004`–`0009` | SynthaEmbed OS — Eve, Modal, 4-stage ML pipeline |
| [`03-asn-scientific-novelty-review.md`](./sources/03-asn-scientific-novelty-review.md) | *(supporting)* | [`SCIENCE_REVIEW.md`](../SCIENCE_REVIEW.md) | Deep literature review — **normative input** |
| [`04-embedding-co-briefing.md`](./sources/04-embedding-co-briefing.md) | [Doc 3](https://docs.google.com/document/d/14Rtz1r_3AQIM8cChKVsjPqt8kHH6PqV6RWPIEkH10Ik/edit) | spec [`0010`](../specs/0010-finance-applied-test.md) | MTNN briefing — four-org → unified network |
| [`05-mtnn-system-design.md`](./sources/05-mtnn-system-design.md) | *(same thread as Doc 3)* | spec [`0010`](../specs/0010-finance-applied-test.md) | Full MTNN architecture — MoE, heads, Sharpe loss |
| [`06-asn-enterprise-integration-manual.md`](./sources/06-asn-enterprise-integration-manual.md) | [Doc 4](https://docs.google.com/document/d/1BjyQqI7gq5c52d576LNiejjqMrYNvfq8bG3ptOps7Zw/edit) | specs `0003`, `0004`, `0008` | ASN deployment — spectral surgery, ER monitoring |
| [`07-embedding-co-lifecycle-narrative.md`](./sources/07-embedding-co-lifecycle-narrative.md) | [Doc 5](https://docs.google.com/document/d/12kAuscAIsTL6CEnAgo1OZT22hKXzz9fcOerkafHEAOI/edit) | spec [`0010`](../specs/0010-finance-applied-test.md), `HANDOFF.md` §3b | Four-org lifecycle, gap-analysis loop |
| [`archive-plan-pre-fleet.md`](./sources/archive-plan-pre-fleet.md) | *(older export)* | superseded by repo [`PLAN.md`](../PLAN.md) | Pre-fleet scaffold — **do not merge back** |

## Normative overlays (repo-only — override source prose)

| File | Overrides |
|---|---|
| [`SCIENCE_REVIEW.md`](../SCIENCE_REVIEW.md) | DROP / VERIFY claims before product copy |
| [`config/fleet.json`](../config/fleet.json) | Domains, site paths, phases |
| [`specs/README.md`](../specs/README.md) | Implemented vs Partial vs Draft |

## Source → spec → code

```
01 + 03 + 06 + WHITEPAPER + SCIENCE_REVIEW
    → specs/0003 (ASN), 0008 (eval gates)
    → packages/asn-engine/, packages/eval-harness/

02 (SynthaEmbed enterprise platform)
    → specs/0002, 0004, 0005, 0006, 0007, 0009
    → services/core-api/, services/worker/, apps/synthorg/, packages/synth-core/

04 + 05 + 07 (Embedding Co / MTNN) — Phase B only, simulation guardrail
    → spec/0010
    → apps/sites/finance-lab/ (stub)
```

## Enterprise ML pipeline (Source 02) vs built today

| Source stage | Subagent | Spec | Built? |
|---|---|---|---|
| 1 · Domain MLM (selective masking) | data_harvester | 0004, 0009 | Partial — ingest/chunk/pairs; MLM on Modal TBD |
| 2 · LMAR chunk + synth pairs | data_harvester | 0004 | ✅ paragraph chunk + pair synth in worker path |
| 3 · zELO / continuous relevance | qa_benchmark | 0008 | Partial — pairwise nDCG@10; zELO/Thurstone TBD |
| 4 · MRL + quant deploy | field_operator | 0004, 0008 | Partial — deploy + pgvector; MRL truncate at serve |

## Eve synthetic org (Source 02) vs built today

| Source concept | Repo location | Status |
|---|---|---|
| Chief of Staff director | `apps/synthorg/agent/` | ✅ instructions + tools |
| data_harvester / training_orchestrator / qa_benchmark / field_operator | `agent/subagents/*` | 🟡 declared; missing `agent.ts` + `description` |
| ACTL KPI governance | instructions + budget tools | Partial |
| Vercel Connect → Modal | `services/trainer` | Stub — local worker is production path |
| Workflows + Sandbox | — | Not built |

## MTNN four-org mapping (Sources 04–07) — Phase B scope

| Legacy org | Neural analogue | Phase B v1 (simulation) |
|---|---|---|
| Org 1 · Data Operations | Multimodal tokenization / ingestion | Finance corpus + point-in-time fixtures |
| Org 2 · AI Architecture | Shared MoE trunk + ASN | Reuse Phase A ASN embed models (not full MoE yet) |
| Org 3 · Quant Simulation | Auxiliary heads (volatility, masked market) | Fictional backtest harness — separate eval gate |
| Org 4 · Live Execution | Differentiable Sharpe head | **DROP for v1** — no live capital; paper sim only |

Gap-analysis loop from Source 07 becomes **simulated attribution reports** in spec 0010, not
live trading feedback.

## Lifecycle mapping (all sources)

| Stage | Subagent | Spec | API |
|---|---|---|---|
| Collect | data_harvester | 0004, 0009 | `/v1/data/*` |
| Train / validate | training_orchestrator | 0003, 0009 | `/v1/train/*` |
| Applied test | qa_benchmark | 0008 | `/v1/eval/*` |
| Real-world use | field_operator | 0004, 0008 | `/v1/model/deploy`, `/v1/embed`, `/v1/search` |

Conductor / Eve orchestration → specs `0005`, `0006`, `0007`.

## Sync workflow

When a Google Doc changes:

1. Export to `docs/sources/` (keep numbered prefix).
2. Diff against canonical file (`WHITEPAPER.md`, `PLAN.md`, or target spec).
3. Apply only claims that pass `SCIENCE_REVIEW.md`.
4. Update this map if filenames or roles change.

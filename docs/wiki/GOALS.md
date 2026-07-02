# Goal alignment baselines

Evaluate new actions against these deliverables. Product claims must match `EVIDENCE.md`.

## Primary mission

Multi-tenant **synthetic orgs** — each runs **collect → train → eval → deploy** to beat
zero-shot embedders (BGE, e5) on *its* corpus, with an **edge tier** (Matryoshka t=8 + int8).

## Phase A deliverables (active)

| Deliverable | Acceptance signal |
|---|---|
| Fleet sites live | hub, control, dumbmodel, benchmark-lab, research-rag on Vercel |
| Uniform API | Sites → `synth-core` → `core-api` only (spec 0006) |
| Eval gates | nDCG@10, effective rank, deploy gates (spec 0008) |
| Hill-climb loop | Phase A org kickoff + BD queue + ledger (spec 0005) |
| Public proof | dumbmodel baseline panel beats narrative without evidence |
| Research RAG | arxiviq tier compare + methods page with evidence dates |

## High-scale data engineering targets

- arXiv corpus ≥ 200 papers per research-rag org (RAG-501)
- Chunk ablation on holdout (RAG-502)
- Hard negative mining in pair builder (RAG-503)
- Real-text bake-offs when disk unblocked (RT-401+)

## Evaluation frameworks

- `packages/eval-harness` — internal gates
- `packages/eval-public` — dumbmodel / slasso public panels
- `EVIDENCE.md` — normative measured ledger
- Autoresearch loop — synthetic nights on `autoresearch_train.py` only

## Guardrails (non-negotiable)

1. v1 = **simulation only** — no live trading
2. ASN weight surgery rejected (0/4 fleet) — not default
3. No overclaiming — `SCIENCE_REVIEW.md` overrides marketing copy
4. Non-trivial features need a spec in `specs/`

## Current blockers (check live)

```powershell
pnpm work:blockers
```

Disk (BLK-DISK) blocks Docker, real-text evals, and large corpus harvests.

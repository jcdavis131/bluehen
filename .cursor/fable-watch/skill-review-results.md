# Skill review results (2026-07-03)

Checklist: [skill-review-checklist.md](./skill-review-checklist.md) · Audit: `uv run python .cursor/fable-watch/audit_skills.py` · Gate: `validate_skills.py`

Source: [Anthropic Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## Summary

| Metric | Before | After |
|---|---|---|
| Skills audited | 42 | 42 |
| Audit clean (soft limits) | 25 | 42 |
| `validate_skills.py` | 42 pass | 42 pass |
| Skills with `reference.md` | 2 | 11 |

## Checklist applied

All 42 skills reviewed against D1–D6 (metadata), B1–B10 (body), S1–S6 (structure). No scripts bundled in these skills (C* N/A).

## Per-skill changes

| Skill | Action |
|---|---|
| **respect-the-guard** | Split credential/copy/API/:exec/gates → `reference.md`; slimmed 96→36 lines |
| **readiness-report** | Split extended handoff patterns → `reference.md`; fixed third-person description |
| **validate-gate** | Merged 4 redundant thin-corpus sections → 1 section; 99→73 lines |
| **prompt-caching** | Moved API/invalidation/checklist to `reference.md`; SKILL = decision + verify |
| **monorepo-review-loop** | Phase table + pointer to `reference.md`; 118→34 lines |
| **use-design-system** | Split shared/local/build/SDK/barrel → `reference.md` |
| **use-available-integrations** | Split credentials/deploy/prod patterns → `reference.md` |
| **background-failure-triage** | Split failure-state + deploy batching → `reference.md` |
| **event-driven-wait** | Split named monitors/chains → `reference.md` |
| **silent-op-recovery** | Split capture-exit idioms → `reference.md`; fixed description |
| **progress-board** | Description: third person + explicit WHEN |
| **conservative-rename** | Description: third person + explicit WHEN |
| **close-the-loop** | Minor trim (was 20 chars over soft limit) |
| **Remaining 29 skills** | Already passed audit; no edits needed |

## Skills with reference files

`monorepo-review-loop`, `prompt-caching`, `respect-the-guard`, `readiness-report`, `use-design-system`, `use-available-integrations`, `background-failure-triage`, `event-driven-wait`, `silent-op-recovery` (+ pre-existing reference content in monorepo/prompt-caching)

## Not done (optional follow-up)

- **Evaluations**: Anthropic recommends 3 scenarios per skill — not automated yet; add under `.cursor/fable-watch/evals/` if desired.
- **Multi-model test**: Haiku/Sonnet/Opus spot-check on trigger phrases — manual.
- **Project skills**: `bluehenre/.cursor/skills/scrub-ai-prose` not in this pass (separate scope).

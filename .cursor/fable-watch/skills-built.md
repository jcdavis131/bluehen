# Fable-Watch Index

> Process: watch terminal 1.txt (Claude / Fable 5 working), extract behavioral patterns, codify each into a skill under `~/.cursor/skills/` so Cursor reaches parity.

## Loop
- PID 26612, every 480s, sentinel `AGENT_LOOP_TICK_FABLE_WATCH`.
- Stop: kill PID, do not re-arm.

## Artifacts
- `observed-patterns.md` — living log of observed behaviors (P-NNN entries).
- `skills-built.md` — index of skills created from this watch.

## Skills built this session
| Skill | From pattern | Location |
|---|---|---|
| `session-orient` | P-001 | `~/.cursor/skills/session-orient/SKILL.md` |
| `shell-confirm-hygiene` | P-002, P-007 | `~/.cursor/skills/shell-confirm-hygiene/SKILL.md` |
| `sme-fanout` | P-003, P-004 | `~/.cursor/skills/sme-fanout/SKILL.md` |
| `smoke-import` | P-005 | `~/.cursor/skills/smoke-import/SKILL.md` |
| `progress-board` | P-006 | `~/.cursor/skills/progress-board/SKILL.md` |
| `dependency-hygiene` | P-008 | `~/.cursor/skills/dependency-hygiene/SKILL.md` |
| `affected-tests` | P-009, P-012 | `~/.cursor/skills/affected-tests/SKILL.md` |
| `cost-transparency` | P-010 | `~/.cursor/skills/cost-transparency/SKILL.md` |
| `auto-mode` | P-011 | `~/.cursor/skills/auto-mode/SKILL.md` |
| `match-conventions` (refined) | P-014, P-016 | `~/.cursor/skills/match-conventions/SKILL.md` |
| `follow-procedure` | P-017 | `~/.cursor/skills/follow-procedure/SKILL.md` |
| `validate-gate` | P-018 | `~/.cursor/skills/validate-gate/SKILL.md` |
| `background-failure-triage` | P-019 | `~/.cursor/skills/background-failure-triage/SKILL.md` |
| `lane-discipline` | P-020 | `~/.cursor/skills/lane-discipline/SKILL.md` |
| `fill-the-wait` | P-021 | `~/.cursor/skills/fill-the-wait/SKILL.md` |
| `sme-fanout` (refined) | P-003, P-004, P-022, P-023 | `~/.cursor/skills/sme-fanout/SKILL.md` |
| `verify-subagent-output` | P-024 | `~/.cursor/skills/verify-subagent-output/SKILL.md` |
| `silent-op-recovery` (refined) | P-025, P-026, P-027 | `~/.cursor/skills/silent-op-recovery/SKILL.md` |
| `persist-learnings` | P-028, P-030 | `~/.cursor/skills/persist-learnings/SKILL.md` |
| `recap-on-long-session` | P-031 | `~/.cursor/skills/recap-on-long-session/SKILL.md` |
| `event-driven-wait` | P-032 | `~/.cursor/skills/event-driven-wait/SKILL.md` |
| `use-design-system` | P-034, P-035, P-036 | `~/.cursor/skills/use-design-system/SKILL.md` |
| `readiness-report` | P-037, P-039, P-040, P-041 | `~/.cursor/skills/readiness-report/SKILL.md` |
| `document-non-action` | P-038 | `~/.cursor/skills/document-non-action/SKILL.md` |
| `pre-commit-hygiene` | P-044, P-045 | `~/.cursor/skills/pre-commit-hygiene/SKILL.md` |
| `abstract-the-provider` | P-046 | `~/.cursor/skills/abstract-the-provider/SKILL.md` |
| `validate-gate` (refined) | P-018, P-042 | `~/.cursor/skills/validate-gate/SKILL.md` |
| `logical-commit-split` | P-047, P-048 | `~/.cursor/skills/logical-commit-split/SKILL.md` |
| `respect-the-guard` | P-049 | `~/.cursor/skills/respect-the-guard/SKILL.md` |
| `readiness-report` (refined) | P-037, P-039, P-040, P-041, P-050 | `~/.cursor/skills/readiness-report/SKILL.md` |
| `abstract-the-provider` (refined) | P-046, P-051 | `~/.cursor/skills/abstract-the-provider/SKILL.md` |
| `metadata-align` | P-052 | `~/.cursor/skills/metadata-align/SKILL.md` |
| `readiness-report` (refined again) | P-037, P-039, P-040, P-041, P-050, P-053 | `~/.cursor/skills/readiness-report/SKILL.md` |
| `close-the-loop` | P-054, P-055, P-056, P-057 | `~/.cursor/skills/close-the-loop/SKILL.md` |
| `respect-the-guard` (refined) | P-049, P-058 | `~/.cursor/skills/respect-the-guard/SKILL.md` |
| `disk-pressure-proactive` | P-059, P-060, P-061 | `~/.cursor/skills/disk-pressure-proactive/SKILL.md` |
| `correct-assumptions` | P-062 | `~/.cursor/skills/correct-assumptions/SKILL.md` |
| `silent-op-recovery` (refined) | P-025, P-026, P-027, P-063 | `~/.cursor/skills/silent-op-recovery/SKILL.md` |
| `background-failure-triage` (refined) | P-019, P-065 | `~/.cursor/skills/background-failure-triage/SKILL.md` |
| `diagnose-before-retry` | P-066, P-067, P-068, P-069 | `~/.cursor/skills/diagnose-before-retry/SKILL.md` |
| `deterministic-core-llm-judgment` | P-070 | `~/.cursor/skills/deterministic-core-llm-judgment/SKILL.md` |
| `agent-guardrails` | P-073 | `~/.cursor/skills/agent-guardrails/SKILL.md` |
| `progress-board` (refined) | P-006, P-015, P-078 | `~/.cursor/skills/progress-board/SKILL.md` |
| `use-design-system` (refined) | P-034, P-035, P-036, P-080, P-081, P-082 | `~/.cursor/skills/use-design-system/SKILL.md` |
| `a11y-gate` | P-085 | `~/.cursor/skills/a11y-gate/SKILL.md` |
| `metadata-align` (refined) | P-052, P-084 | `~/.cursor/skills/metadata-align/SKILL.md` |
| `policy-as-config` | P-088 | `~/.cursor/skills/policy-as-config/SKILL.md` |
| `use-design-system` (refined) | P-034, P-035, P-036, P-080, P-081, P-082, P-090 | `~/.cursor/skills/use-design-system/SKILL.md` |
| `silent-op-recovery` (refined) | P-025, P-026, P-027, P-063, P-091 | `~/.cursor/skills/silent-op-recovery/SKILL.md` |
| `validate-gate` (refined) | P-018, P-042, P-092 | `~/.cursor/skills/validate-gate/SKILL.md` |
| `idempotent-seed-script` | P-095 | `~/.cursor/skills/idempotent-seed-script/SKILL.md` |
| `document-non-action` (refined) | P-038, P-094 | `~/.cursor/skills/document-non-action/SKILL.md` |
| `respect-the-guard` (refined) | P-049, P-058, P-098 | `~/.cursor/skills/respect-the-guard/SKILL.md` |
| `close-the-loop` (refined) | P-054, P-055, P-056, P-057, P-100 | `~/.cursor/skills/close-the-loop/SKILL.md` |
| `readiness-report` (refined) | P-037, P-039, P-040, P-041, P-050, P-053, P-101 | `~/.cursor/skills/readiness-report/SKILL.md` |
| `use-available-integrations` | P-105, P-106, P-108 | `~/.cursor/skills/use-available-integrations/SKILL.md` |
| `respect-the-guard` (refined) | P-049, P-058, P-098, P-107 | `~/.cursor/skills/respect-the-guard/SKILL.md` |
| `use-available-integrations` (refined) | P-105, P-106, P-108, P-109, P-110 | `~/.cursor/skills/use-available-integrations/SKILL.md` |
| `readiness-report` (refined) | P-037, P-039, P-040, P-041, P-050, P-053, P-101, P-111, P-112, P-113 | `~/.cursor/skills/readiness-report/SKILL.md` |
| `conservative-rename` | P-118, P-119 | `~/.cursor/skills/conservative-rename/SKILL.md` |
| `post-deploy-smoke` | P-123, P-124 | `~/.cursor/skills/post-deploy-smoke/SKILL.md` |
| `event-driven-wait` (refined) | P-032, P-126 | `~/.cursor/skills/event-driven-wait/SKILL.md` |
| `auto-mode` (refined) | P-011, P-127 | `~/.cursor/skills/auto-mode/SKILL.md` |
| `use-available-integrations` (refined) | P-105, P-106, P-108, P-109, P-110, P-128, P-129 | `~/.cursor/skills/use-available-integrations/SKILL.md` |
| `idempotent-seed-script` (refined) | P-095, P-131 | `~/.cursor/skills/idempotent-seed-script/SKILL.md` |
| `post-deploy-smoke` (refined) | P-123, P-124, P-132 | `~/.cursor/skills/post-deploy-smoke/SKILL.md` |
| `metadata-align` (refined) | P-052, P-084, P-136 | `~/.cursor/skills/metadata-align/SKILL.md` |
| `respect-the-guard` (refined) | P-049, P-058, P-098, P-107, P-140 | `~/.cursor/skills/respect-the-guard/SKILL.md` |
| `persist-learnings` (refined) | P-028, P-030, P-144 | `~/.cursor/skills/persist-learnings/SKILL.md` |
| `validate-gate` (refined) | P-018, P-042, P-092, P-146 | `~/.cursor/skills/validate-gate/SKILL.md` |
| `readiness-report` (refined) | P-037, P-039, P-040, P-041, P-050, P-053, P-101, P-111, P-112, P-113, P-143 | `~/.cursor/skills/readiness-report/SKILL.md` |
| `close-the-loop` (refined) | P-054, P-055, P-056, P-057, P-100, P-148 | `~/.cursor/skills/close-the-loop/SKILL.md` |
| `correct-assumptions` (refined) | P-062, P-149, P-150 | `~/.cursor/skills/correct-assumptions/SKILL.md` |
| `use-available-integrations` (refined) | P-105, P-106, P-108, P-109, P-110, P-128, P-129, P-152, P-153, P-155 | `~/.cursor/skills/use-available-integrations/SKILL.md` |
| `logical-commit-split` (refined) | P-047, P-048, P-154 | `~/.cursor/skills/logical-commit-split/SKILL.md` |
| `diagnose-before-retry` (refined) | P-066, P-067, P-068, P-069, P-156 | `~/.cursor/skills/diagnose-before-retry/SKILL.md` |
| `validate-gate` (refined) | P-018, P-042, P-092, P-146, P-164 | `~/.cursor/skills/validate-gate/SKILL.md` |
| `readiness-report` (refined) | P-037, P-039, P-040, P-041, P-050, P-053, P-101, P-111, P-112, P-113, P-143, P-162 | `~/.cursor/skills/readiness-report/SKILL.md` |
| `a11y-gate` (refined) | P-085, P-167 | `~/.cursor/skills/a11y-gate/SKILL.md` |
| `follow-procedure` (refined) | P-017, P-043, P-168 | `~/.cursor/skills/follow-procedure/SKILL.md` |
| `event-driven-wait` (refined) | P-032, P-126, P-170, P-171, P-172 | `~/.cursor/skills/event-driven-wait/SKILL.md` |
| `respect-the-guard` (refined) | P-049, P-058, P-098, P-107, P-140, P-173 | `~/.cursor/skills/respect-the-guard/SKILL.md` |
| `background-failure-triage` (refined) | P-019, P-065, P-174 | `~/.cursor/skills/background-failure-triage/SKILL.md` |
| `respect-the-guard` (refined) | P-049, P-058, P-098, P-107, P-140, P-173, P-177 | `~/.cursor/skills/respect-the-guard/SKILL.md` |
| `validate-gate` (refined) | P-018, P-042, P-092, P-146, P-164, P-184 | `~/.cursor/skills/validate-gate/SKILL.md` |
| `background-failure-triage` (refined) | P-019, P-065, P-174, P-186 | `~/.cursor/skills/background-failure-triage/SKILL.md` |
| `progress-board` (refined) | P-015 | `~/.cursor/skills/progress-board/SKILL.md` |
| `monorepo-review-loop` | synthesis of P-001..P-187 | `~/.cursor/skills/monorepo-review-loop/SKILL.md` — the workflow that incorporates all 39 skills into a 10-phase review arc; runner `scripts/monorepo_review_loop.py`; reference `~/.cursor/skills/monorepo-review-loop/reference.md` |
| `session-orient` (refined) | P-001, P-188 | `~/.cursor/skills/session-orient/SKILL.md` — apply recon on loop resumption after a gap, not only at session start |
| `progress-board` (refined) | P-006, P-015, P-078, P-189 | `~/.cursor/skills/progress-board/SKILL.md` — /loop continuation prompt restates the goal + cadence, not just "continue" |
| `prompt-caching` | Anthropic docs | `~/.cursor/skills/prompt-caching/SKILL.md` — Messages API cache_control, breakpoints, verification, fleet agent patterns; reference `~/.cursor/skills/prompt-caching/reference.md` |

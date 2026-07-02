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
| `progress-board` (refined) | P-015 | `~/.cursor/skills/progress-board/SKILL.md` |

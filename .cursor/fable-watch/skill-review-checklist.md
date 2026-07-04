# Skill review checklist (Anthropic + Cursor)

> Source: [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) · Cursor `create-skill` skill · validated against `validate_skills.py`.

Use this when reviewing or optimizing any skill under `~/.cursor/skills/`.

## Discovery (metadata — always loaded)

| # | Check | Pass criteria |
|---|---|---|
| D1 | `name` valid | ≤64 chars; lowercase letters, numbers, hyphens only; matches directory name |
| D2 | `description` non-empty | ≤1024 chars; no XML tags |
| D3 | Third person | No "I can…", "You can…", "your task" in description — use "Use when…" triggers |
| D4 | WHAT + WHEN | Description states capabilities **and** trigger scenarios (keywords agents match on) |
| D5 | Specific, not vague | Not "helps with data" — name domains, commands, file types, task prefixes |
| D6 | Trigger terms | Include repo-specific cues (`pick_task`, `EVIDENCE.md`, `pnpm review`, lane names) where relevant |

## Body (loaded when skill is relevant)

| # | Check | Pass criteria |
|---|---|---|
| B1 | Concise | No textbook explanations the model already knows; every paragraph earns its tokens |
| B2 | Under 500 lines | SKILL.md body ≤500 lines (split to `reference.md` if larger) |
| B3 | Target ≤120 lines / ≤4k chars | For fable-watch skills: quick-scan body; deep detail in `reference.md` |
| B4 | One H1 | Top-level `#` heading matches skill purpose |
| B5 | No empty sections | No `##` header immediately followed by another header |
| B6 | Consistent terminology | One term per concept (gate, span, lane, deploy) — no synonym mixing |
| B7 | No time-sensitive rules | No "before August 2025…"; use "Current" / "Old patterns" sections if needed |
| B8 | Forward slashes only | Paths like `scripts/foo.py`, not `scripts\foo.py` |
| B9 | Default + escape hatch | One recommended approach; alternates only when necessary |
| B10 | Appropriate freedom | Low freedom for fragile ops (migrate, deploy); high for reviews/heuristics |

## Structure

| # | Check | Pass criteria |
|---|---|---|
| S1 | Progressive disclosure | SKILL.md = quick start + workflow; `reference.md` = commands, examples, long tables |
| S2 | References one level deep | SKILL.md → `reference.md` only; no `reference.md` → `details.md` chains |
| S3 | Workflow steps | Complex tasks have numbered steps or copy-paste checklist |
| S4 | Feedback loops | Quality-critical skills include validate → fix → re-validate |
| S5 | When to skip | Optional "When to skip" for skills that shouldn't fire on trivial requests |
| S6 | Pair with | Cross-links to sibling skills by name (not duplicate their full content) |

## Scripts (if any)

| # | Check | Pass criteria |
|---|---|---|
| C1 | Execute vs read | State whether to **run** the script or **read** it as reference |
| C2 | Errors handled | Scripts don't punt failures to the agent without messages |
| C3 | No magic constants | Timeouts/limits documented |
| C4 | Dependencies listed | Packages/commands required before use |

## Scoring (per skill)

- **Pass**: all D1–D6, B1–B10, S1–S6 relevant to that skill
- **Optimize**: any fail → fix in place or split to reference
- **Validate**: `uv run python .cursor/fable-watch/validate_skills.py` → exit 0

## Optimization playbook

1. **Too long** → Keep "## Quick start" + "## Workflow" in SKILL.md; move anti-patterns, examples, command tables to `reference.md`; add one-line link at top of body.
2. **Description weak** → Rewrite: `<Verb>s <object>. Use when <triggers>.`
3. **Duplicate content across skills** → Keep canonical copy in one skill; others say "See `validate-gate`" in Pair with.
4. **Refined many times (fable-watch)** → Merge redundant sections (e.g. four "thin corpus" paragraphs → one rule + one example).

---
name: scrub-ai-prose
description: Review and edit prose in specs, prompts, and docs to remove AI-generated tells so the writing does not read as machine-authored. Use when the user asks to "deslop", "scrub", "de-AI", or "humanize" prose, or when a spec, prompt, or doc was drafted by an agent and needs to read like a person wrote it. Also use proactively before finalizing any spec under specs/, prompt under prompts/, or doc under docs/ that an agent authored.
---

# Scrub AI prose

Review prose in specs, prompts, and docs and rewrite the tells that mark writing as AI-authored. Preserve all technical content exactly (token names, component names, code blocks, tables, grep commands, acceptance criteria logic). Only the connective prose changes.

## When to use

- The user says "deslop", "scrub", "de-AI", "humanize", or "make sure this doesn't look AI-generated".
- Before finalizing an agent-authored spec (`specs/NNNN-*.md`), prompt (`prompts/*.md`), or doc (`docs/*.md`).
- The user references tools like deslop-text, slop-cop, or aislop and wants the equivalent pass run here.

## What to preserve (do not touch)

- Code blocks, CSS, token values, file paths, grep/rg commands.
- Component names, prop names, acceptance criteria logic, table contents.
- Technical comparisons inside contract sections (`768px and up` is prose and can be normalized; `>= 768px` inside a code block stays).
- Anything inside fenced ``` blocks.

## The rubric (high-signal tells to remove)

Run this list against every prose paragraph. Each is a tell that the writing is machine-authored.

1. **Section sign `§`.** Remove entirely. Replace `§Rollout` with "the Rollout section", `§Test plan` with "the spec's Test plan section".
2. **Em-dash asides.** `X — Y — Z` parenthetical asides and `Header — subtitle` headers. Replace with periods, commas, colons, or rephrase. A stray em-dash is fine; clusters are the tell.
3. **"Not X but Y" / "It's not X, it's Y" / "You are not X. You are Y."** Rephrase to a direct positive statement.
4. **"The real X is Y" / "This is where X comes from" / "This is not X. This is Y."** Rephrase.
5. **"Familiar yet distinct" and other marketing repetitions.** Say it once in the whole doc, or replace with concrete language ("familiar without reading generic").
6. **Middot parallelism in prose.** `symmetry · negative space · cold precision` reads as a tag generator. In prose, use commas. Inside a code/diagram node label, middots are fine.
7. **Uniform bold-lead bullet cadence.** `**One-point perspective:** ...` repeated for every bullet in every list. Vary: some bold leads, some plain-sentence bullets, some with the label as a period (`**Kubrick.** One-point perspective...`).
8. **AI vocabulary.** `leverage, seamless, robust, comprehensive, ecosystem, delve, tapestry, in the realm of, notably, crucially, furthermore, moreover, it's important to note, ensure that, elevate, empower, unlock, supercharge, foster, facilitate`. Replace with plain verbs or cut.
9. **Symbol-as-prose.** `≥768px`, `<480px`, `→` inside prose sentences. Normalize to "768px and up", "below 480px", "then". Inside code blocks they stay.
10. **"Blended" / "synthesis" / "voice" overuse.** Vary or cut when repeated more than twice in a section.
11. **Title-case marketing phrasing.** Soften to sentence case where the term is not a proper name.
12. **Triple parallelism.** "X, Y, and Z" where all three are abstractions of equal weight, repeated as the structural backbone of multiple sentences. Break one out as its own sentence.

## Workflow

1. **Read the whole file first.** Do not edit blind. Know what the doc is for and what is technical contract vs. prose.
2. **Grep for the mechanical tells.** Run `Grep` for `§`, `—`, `→`, `≥`, `<[0-9]+px`, and the AI vocabulary list. This finds the concrete offenders fast.
3. **Edit prose sections, not contract sections.** Use `StrReplace` on prose paragraphs. Leave code blocks, tables, acceptance-criteria logic, and grep commands intact. Only their connective prose changes.
4. **Vary the cadence.** When rewriting a list, do not replace one uniform bold-lead pattern with another uniform pattern. Mix bold leads, plain sentences, and period-terminated labels.
5. **Keep it tight.** The goal is not to inflate or add personality. Cut more than you add. A shorter sentence almost always reads more human.
6. **Re-grep after editing.** Confirm `§` is zero, em-dashes in prose are gone (a few in code comments are acceptable), and no AI vocabulary remains.
7. **Read the opening and one middle section aloud in your head.** If a sentence reads like it could have been generated for any project, rewrite it to say something specific to this one.

## Specific to this fleet

- Specs live at `specs/NNNN-*.md` and follow `specs/0000-template.md`. The Problem, Goals, Non-goals, Design prose, and Risks are the usual tell-heavy sections. Acceptance criteria and Test plan are contract; scrub their connective prose only.
- Prompts live at `prompts/*.md`. The Role and Constraints sections get the bold-lead + em-dash treatment heaviest.
- `docs/DESIGN_SYSTEM.md` and other `docs/` files: only scrub sections you authored in this session. Pre-existing content is out of scope unless the user asks for the whole file.
- The fleet voice is enterprise B2B (see `docs/VOICE_AND_PLATFORM.md`). Do not soften into casual or marketing register while scrubbing.

## Output

After the pass, report in 1 to 3 sentences:
- Which files were scrubbed.
- Which tells were most common.
- Anything you intentionally left (and why, e.g. em-dashes in a code comment).

Do not produce a long summary. The edit is the deliverable.

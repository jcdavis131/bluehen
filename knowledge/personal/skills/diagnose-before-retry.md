---
title: "skill: diagnose-before-retry"
tags: [skill, fable-watch]
source: ".cursor/fable-watch"
added: 2026-07-05
format: okf/v0
---

A Cursor skill distilled from watching Fable work (the fable-watch project). Motivating patterns:

- **P-066** — Diagnose the failure from logs before retrying
- **P-067** — Distinguish op failure from self-caused interruption
- **P-068** — Hypothesize a likely cause with supporting context, not certainty
- **P-069** — Retry in foreground with timeout + CR-to-NL + blank-strip + tail

Part of the 42-skill set audited against Anthropic's skill best practices (42/42 passing). Story: [[the-watcher-and-the-watched]]

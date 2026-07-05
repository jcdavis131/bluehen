---
title: "skill: silent-op-recovery"
tags: [skill, fable-watch]
source: ".cursor/fable-watch"
added: 2026-07-05
format: okf/v0
---

A Cursor skill distilled from watching Fable work (the fable-watch project). Motivating patterns:

- **P-025** — Kill a silent long op and retry with visible output
- **P-026** — Track PIDs of long-running ops so you can kill them cleanly
- **P-027** — Check interim progress directly; don't wait for the exit notification

Part of the 42-skill set audited against Anthropic's skill best practices (42/42 passing). Story: [[the-watcher-and-the-watched]]

---
title: "skill: use-available-integrations"
tags: [skill, fable-watch]
source: ".cursor/fable-watch"
added: 2026-07-05
format: okf/v0
---

A Cursor skill distilled from watching Fable work (the fable-watch project). Motivating patterns:

- **P-105** — Load the available integration's tools before using them
- **P-106** — Check existing state first; only act on the missing set
- **P-108** — Direct API call as fallback for ops the integration tools don't expose

Part of the 42-skill set audited against Anthropic's skill best practices (42/42 passing). Story: [[the-watcher-and-the-watched]]

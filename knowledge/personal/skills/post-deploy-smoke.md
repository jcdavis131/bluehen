---
title: "skill: post-deploy-smoke"
tags: [skill, fable-watch]
source: ".cursor/fable-watch"
added: 2026-07-05
format: okf/v0
---

A Cursor skill distilled from watching Fable work (the fable-watch project). Motivating patterns:

- **P-123** — Post-deploy smoke loop: bounded retry polling live URLs for expected content
- **P-124** — `export TERM=dumb` to keep scripted output clean

Part of the 42-skill set audited against Anthropic's skill best practices (42/42 passing). Story: [[the-watcher-and-the-watched]]

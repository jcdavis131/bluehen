---
title: "The watcher and the watched"
tags: [journal, fable-watch, agents]
source: ".cursor/fable-watch"
added: 2026-07-03
format: okf/v0
---

While Fable ran the build loop — claiming tasks, spawning subagents,
shipping to prod — Cursor sat in another window doing something
quieter: watching. Every 480 seconds a watch loop read the working
terminal, extracted behavioral patterns (numbered P-001 onward), and
codified each into a reusable skill.

Seventy-plus patterns became **42 skills**: how to orient at session
start, when to verify a subagent's output instead of trusting the
summary, how to fill the wait while a background job runs, when a
failed gate is the product working. All 42 were then audited against
Anthropic's skill best practices — 42 of 42 passing.

The part I keep thinking about: this is the knowledge flywheel eating
its own tail, in a good way. One agent works; another distills the
working into transferable skill; the skills make the next agent
better; and now the whole episode becomes notes in this knowledge
base, embedded into the same semantic map the work produced. The org
doesn't just do things — it learns *how it does things*, in a format
([[embedding-spaces]], OKF markdown) that any future agent can read.

The full skill set lives under the `skill:` notes on this map.

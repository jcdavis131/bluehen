# Validation Lab (slasso)

**Codename:** slasso, Validation Lab, benchmark-lab  
**Also called:** "agent-lasso" (legacy repo)  
**Domain:** slasso.com  
**Status:** Active — Phase A  
**Site id:** `benchmark-lab`

## What it is

Validation & Charter product surface — certified RAG benchmark exams, leaderboards, promotion
pipeline UI. Silver Lasso lineage.

## Key people / agents

- **Validation & Charter (BD division)** — owns exam gates and Validation Queue
- **Operator** — pilot approval
- **Research & Development** — submits candidates to queue

## Context

- `/try` — run benchmark (live search)
- `/queue` — Validation Queue (`data/bd/queue.json`)
- YAML exam runner — Phase A TODO
- Public funnel: dumbmodel (baseline) → slasso (validation) → bhenre (console)

## Tech

- App: `apps/sites/benchmark-lab`
- Workspace key: `data/workspaces/benchmark-lab.env`
- Port local: 3003

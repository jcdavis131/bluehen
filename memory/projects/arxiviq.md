# Applied Research (arxiviq)

**Codename:** arxiviq, Applied Research, research-rag  
**Also called:** "arxiv exam app" (legacy repo)  
**Domain:** arxiviq.com  
**Status:** Active — Phase A  
**Site id:** `research`

## What it is

R&D product surface — arXiv-flavored RAG evaluation, Research Registry (method museum),
live search on org corpus.

## Key people / agents

- **Research & Development** — primary division
- **Data Operations** — corpus ingest secondary
- **Validation & Charter** — receives promotion candidates

## Context

- `/research-lab` — Research Registry (`data/research_lab.json`)
- `/` — live search + ArxivExamDemo
- Background autoresearch sweeps continue; page is registry snapshot
- Port local: 3004

## Tech

- App: `apps/sites/research`
- Workspace key: `data/workspaces/research-rag.env`

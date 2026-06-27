# 0001 — Platform Overview & Boundaries

- **Status:** Draft
- **Related specs:** 0002, 0003, 0004, 0005

## Problem
We are building a multi-tenant platform that runs many autonomous "mini-organizations,"
each training and serving a domain-specialized, collapse-resistant embedding model on a
shared engine (ASN). Without a shared glossary and explicit boundaries, the three source
concepts (ASN engine, SynthaEmbed platform, MTNN vertical) will drift apart.

## Goals
- Define the vocabulary used across every other spec.
- Fix the system boundary: what the platform does and does not do.

## Glossary
- **Mini-org / workspace / tenant:** an isolated organization with its own site, API key,
  data, vectors, models, and auto-research loop.
- **ASN engine:** the shared training method (`packages/asn-engine`).
- **Conductor:** the auto-research loop that proposes recipes and launches training.
- **Ledger:** the immutable record of every training iteration and its metric delta.
- **Evaluation gate:** a metric+threshold that CI enforces so claims stay falsifiable.

## Non-goals
- Executing financial trades or moving money (the MTNN produces models/analytics only).
- General-purpose LLM hosting; we host *embedding* models and the research loop around them.
- Per-tenant forks of the engine. One engine, many tenants, isolated by data.

## Acceptance criteria
1. Every other spec uses these terms as defined here.
2. The boundary list above is reflected in `core-api` route scoping and in product copy.

## Risks
- Concept drift across sources → mitigated by this spec being the canonical glossary.

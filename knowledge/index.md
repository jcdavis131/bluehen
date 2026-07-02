---
okf_version: "0.1"
---

# Blue Hen RE — Knowledge Bundle

OKF v0.1 bundle for the SynthaEmbed OS platform. Written by humans and
agents; consumed by both. See `docs/wiki/` for agent operating docs — this
bundle holds *knowledge*: platform concepts, dataset provenance cards, and
expert review reports that grow as the platform evolves.

# Sections

* [Platform](platform/) - Concept documents for the ML platform: data pipeline, experiment tracking, training console, telemetry API.
* [Datasets](datasets/) - Point-in-time dataset cards emitted by every `datalab` collection run.
* [Reviews](reviews/) - Living subject-matter-expert review reports (UX/UI, security, e-commerce, backend architecture, usability). Each report is revised in place as the platform evolves; history lives in `log.md` and git.

# Conventions

* Every concept has YAML frontmatter with a required `type`.
* Cross-links use bundle-absolute paths (`/platform/data-pipeline.md`).
* `log.md` records changes newest-day-first; reviews append findings rather than rewriting history.

# Contributing

This is a spec-driven, multi-agent codebase. The bar for changes:

1. **Spec before code.** Features start as a spec in [`specs/`](./specs/)
   (numbered, with status and owner). Small fixes reference the queue
   item in [`TASKS.md`](./TASKS.md).
2. **Evidence discipline.** Claims about model/retrieval performance must
   cite a measured row in [`EVIDENCE.md`](./EVIDENCE.md) — same slice,
   same metric code, provenance labeled. Honest nulls are welcome.
3. **Honest UI.** A number renders only if a tool measured it; absent
   data shows an empty state with its unblock command. Never fake state.
4. **No secrets, ever.** Runtime credentials live in gitignored paths and
   platform env vars. `.env.example` documents shape with placeholders.
5. **Tests green before push.** `uv run pytest` for Python;
   `pnpm typecheck && pnpm build` for any site you touched.

Toolchain: `pnpm` (workspaces) + `uv` (Python), Windows-friendly.
Dev quickstart is in the README. Questions → open an issue.

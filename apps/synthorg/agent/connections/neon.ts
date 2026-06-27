/**
 * Neon Postgres + pgvector connection (typed integration descriptor).
 *
 * All metadata, the experiment ledger, the trace store, and vectors live in one
 * RLS-isolated Neon database per the tenancy model (specs/0002). Reached only through the
 * unified access layer; this file documents the contract.
 */
export const neonConnection = {
  name: "neon",
  via: "vercel-connect-oidc",
  capabilities: ["documents", "embeddings", "ledger", "trace", "vector.search"],
  isolation: "row-level-security on workspace_id",
} as const;

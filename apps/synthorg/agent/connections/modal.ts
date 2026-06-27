/**
 * Modal connection (typed integration descriptor).
 *
 * Heavy PyTorch/GPU work runs on Modal, reached only through the unified access layer
 * (core-api proxies train/eval to Modal). Credentials are exchanged at runtime via Vercel
 * Connect OIDC, never stored here. This file documents the contract; the actual compute
 * lives in services/trainer/modal_app.py.
 */
export const modalConnection = {
  name: "modal",
  via: "vercel-connect-oidc",
  capabilities: ["train.launch", "train.status", "eval.run"],
  notes: "No static secrets. Tokens are short-lived and scoped per task.",
} as const;

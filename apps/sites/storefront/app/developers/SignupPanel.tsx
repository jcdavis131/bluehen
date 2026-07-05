"use client";

import { useState } from "react";

/** Spec 0034 §2: the zero-involvement front door. POST /v1/signup (proxied
 * through /api/launchpad/signup, which is public — no sandbox key) issues a
 * Free-tier workspace + API key instantly. No briefing, no human — the key
 * is the whole onboarding flow. */

type SignupLimits = {
  meteredCallsPerMonth: number;
  corpora: number;
  corpusDocs: number;
  trainingBudgetUsdPerDay: number;
};

type SignupResponse = {
  workspaceId?: string;
  apiKey?: string;
  tier?: string;
  limits?: SignupLimits;
  docs?: string;
  upgrade?: string;
};

export function SignupPanel() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SignupResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSignup() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/launchpad/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : `request failed (${res.status})`;
        throw new Error(message);
      }
      setResult(data as SignupResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "signup failed");
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!result?.apiKey) return;
    try {
      await navigator.clipboard.writeText(result.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — copy button is a courtesy, not a requirement
    }
  }

  if (result?.apiKey) {
    return (
      <div className="bh-card" style={{ marginTop: 16, padding: 20 }}>
        <div className="bh-card__title" style={{ marginTop: 0 }}>
          Your key
        </div>
        <div className="bh-card bh-card--inset" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 14px",
              borderBottom: "1px solid var(--bh-border)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--bh-font-mono)",
                fontSize: "0.68rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--bh-muted)",
              }}
            >
              SYNTH_API_KEY
            </span>
            <button type="button" className="bh-btn bh-btn--ghost bh-btn--sm" onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre
            className="bh-pre-result"
            style={{ overflowX: "auto", margin: 0, padding: "14px", fontSize: "0.8125rem" }}
          >
            <code>{result.apiKey}</code>
          </pre>
        </div>

        <p className="bh-card__body" style={{ fontWeight: 600, marginBottom: 16 }}>
          Shown once — store it now. No account exists to recover it (email
          helps us help you later).
        </p>

        {result.limits && (
          <div className="bh-table-wrap" style={{ marginBottom: 16 }}>
            <table className="bh-table">
              <tbody>
                <tr>
                  <th>Limit</th>
                  <th>Value</th>
                </tr>
                <tr>
                  <td>Metered calls / month</td>
                  <td>{result.limits.meteredCallsPerMonth}</td>
                </tr>
                <tr>
                  <td>Corpora</td>
                  <td>{result.limits.corpora}</td>
                </tr>
                <tr>
                  <td>Docs per corpus</td>
                  <td>{result.limits.corpusDocs}</td>
                </tr>
                <tr>
                  <td>Training budget / day</td>
                  <td>${result.limits.trainingBudgetUsdPerDay.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {result.upgrade && (
          <p className="bh-card__body" style={{ margin: 0 }}>
            {result.upgrade}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bh-card" style={{ marginTop: 16, padding: 20 }}>
      <div className="bh-card__title" style={{ marginTop: 0 }}>
        Get a key — instantly
      </div>
      <p className="bh-card__body">
        No briefing, no human in the loop: issue a Free-tier workspace and API
        key right now. Name and email are both optional — email only helps us
        reach you if a recovery path ever exists.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ flex: "1 1 220px" }}>
          <label className="bh-label" htmlFor="signup-name">
            Name (optional)
          </label>
          <input
            id="signup-name"
            className="bh-input"
            style={{ width: "100%" }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Retail"
          />
        </div>
        <div style={{ flex: "1 1 220px" }}>
          <label className="bh-label" htmlFor="signup-email">
            Email (optional)
          </label>
          <input
            id="signup-email"
            type="email"
            className="bh-input"
            style={{ width: "100%" }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
      </div>

      {error && (
        <p className="bh-card__body" style={{ color: "var(--bh-danger, #a4322e)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        className="bh-btn bh-btn--primary"
        disabled={busy}
        onClick={handleSignup}
      >
        {busy ? "Issuing…" : "Issue my free key"}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";

/** Premium report gate (Spec 0021 P5) — Stripe subscription attaches at Operator gate. */
export function ReportPaywall() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          interest: "premium-reports",
        }),
      });
      if (!res.ok) {
        const out = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(out?.error ?? `signup failed (${res.status})`);
      }
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="bh-card bh-card--organic" role="status">
        <div className="bh-card__title">Subscription interest recorded</div>
        <p className="bh-card__body">
          We&apos;ll email when premium report access opens. Paper-trading simulation reports only — not
          investment advice.
        </p>
      </div>
    );
  }

  return (
    <div className="bh-card bh-card--organic">
      <div className="bh-card__title">Premium report feed</div>
      <p className="bh-card__body">
        The first published report is free. Subscribe to unlock the full feed of paper-trading simulation
        reports as the omni loop publishes them. From <strong>$29/mo</strong> (placeholder — Operator pricing
        gate). Billing attaches when Stripe subscription wiring ships (MON-001).
      </p>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
        <label className="bh-label" style={{ flex: "1 1 220px" }}>
          Work email
          <input name="email" type="email" required className="bh-input" style={{ width: "100%", marginTop: 4 }} />
        </label>
        <button type="submit" className="bh-btn bh-btn--primary bh-btn--hero" disabled={status === "sending"}>
          {status === "sending" ? "Saving…" : "Notify me at launch"}
        </button>
      </form>
      {status === "error" && (
        <div className="bh-alert bh-alert--error" style={{ marginTop: 12 }} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

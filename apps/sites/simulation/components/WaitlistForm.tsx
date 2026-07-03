"use client";

import { useState } from "react";

export function WaitlistForm({ defaultInterest = "prediction-markets" }: { defaultInterest?: string } = {}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
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
      <p className="bh-card__body" role="status">
        You&apos;re on the list. Strategy reports go out when simulation batches
        clear review — simulation results only, never trading advice.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
      <label className="bh-label" style={{ flex: "1 1 220px" }}>
        Work email
        <input name="email" type="email" required className="bh-input" style={{ width: "100%", marginTop: 4 }} />
      </label>
      <label className="bh-label" style={{ flex: "1 1 180px" }}>
        Most interested in
        <select name="interest" className="bh-select" style={{ width: "100%", marginTop: 4 }} defaultValue={defaultInterest}>
          <option value="prediction-markets">Prediction markets</option>
          <option value="sports-dfs">Sports DFS</option>
          <option value="equities">Equities</option>
          <option value="methodology">Methodology</option>
        </select>
      </label>
      <button type="submit" className="bh-btn bh-btn--primary bh-btn--hero" disabled={status === "sending"}>
        {status === "sending" ? "Joining…" : "Join the waitlist"}
      </button>
      {status === "error" && (
        <span className="bh-alert bh-alert--error" role="alert" style={{ flexBasis: "100%" }}>
          {error}
        </span>
      )}
    </form>
  );
}

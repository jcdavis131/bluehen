"use client";

import { useState } from "react";
import { GLOSSARY } from "@synthaembed/fleet";

export function FeedbackForm({
  siteId,
  division,
  title = GLOSSARY.feedback,
  description = `Feedback is recorded in the ${GLOSSARY.raceLog} so Data Operations, R&D, and Validation can prioritize the next lifecycle run.`,
}: {
  siteId: string;
  division?: string;
  title?: string;
  description?: string;
}) {
  const [rating, setRating] = useState<"up" | "down" | "neutral">("neutral");
  const [query, setQuery] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteId,
          division,
          rating,
          query: query.trim() || undefined,
          comment: comment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setStatus("ok");
      setComment("");
    } catch (err) {
      setStatus("err");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form onSubmit={submit} className="fleet-card bh-card--organic">
      <h3 className="bh-title--sm" style={{ margin: "0 0 8px" }}>
        {title}
      </h3>
      <p className="bh-lead" style={{ marginBottom: 16, fontSize: "0.8125rem" }}>
        {description}
      </p>

      <fieldset style={{ border: "none", margin: "0 0 16px", padding: 0 }}>
        <legend className="bh-label">Sentiment</legend>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["up", "neutral", "down"] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`bh-btn bh-btn--ghost bh-btn--sm${rating === r ? " is-active" : ""}`}
              style={
                rating === r
                  ? { borderColor: "var(--bh-accent)", background: "var(--bh-accent-muted)" }
                  : undefined
              }
              onClick={() => setRating(r)}
            >
              {r === "up" ? "👍 Good" : r === "down" ? "👎 Needs work" : "💬 Note"}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="bh-label" htmlFor={`feedback-query-${siteId}`}>
        Related query (optional)
      </label>
      <input
        id={`feedback-query-${siteId}`}
        className="bh-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="What were you trying to retrieve?"
        style={{ marginBottom: 12 }}
      />

      <label className="bh-label" htmlFor={`feedback-comment-${siteId}`}>
        Feedback *
      </label>
      <textarea
        id={`feedback-comment-${siteId}`}
        className="bh-textarea"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        required
        rows={4}
        placeholder="What worked? What gaps remain? What data or eval coverage do we need?"
      />

      <button
        type="submit"
        className="bh-btn bh-btn--primary"
        disabled={status === "sending" || !comment.trim()}
        style={{ marginTop: 16 }}
      >
        {status === "sending" ? "Sending…" : `Submit ${GLOSSARY.feedback.toLowerCase()}`}
      </button>

      {status === "ok" && (
        <p className="bh-alert bh-alert--ok" style={{ marginTop: 12, marginBottom: 0 }}>
          Recorded in {GLOSSARY.raceLog}. Orchestration will route to the appropriate division.
        </p>
      )}
      {error && (
        <p className="bh-alert bh-alert--error" style={{ marginTop: 12, marginBottom: 0 }}>
          {error}
        </p>
      )}
    </form>
  );
}

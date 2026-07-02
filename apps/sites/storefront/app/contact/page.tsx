"use client";

import { PageHeader } from "@synthaembed/ui-fleet";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function ContactForm() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const out = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(out?.error ?? `request failed (${res.status})`);
      }
      setStatus("sent");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="bh-card">
        <div className="bh-card__title">Briefing received</div>
        <p className="bh-card__body">
          Thank you — the team reviews briefings each business day and will
          reply from a bhenre.com address within two business days.
        </p>
      </div>
    );
  }

  const field: React.CSSProperties = {
    display: "block", width: "100%", marginBottom: 12, padding: "8px 10px",
  };

  return (
    <form onSubmit={onSubmit} className="bh-card" style={{ maxWidth: 560 }}>
      <label className="bh-card__body">
        Name
        <input name="name" style={field} autoComplete="name" />
      </label>
      <label className="bh-card__body">
        Work email *
        <input name="email" type="email" required style={field} autoComplete="email" />
      </label>
      <label className="bh-card__body">
        Company
        <input name="company" style={field} autoComplete="organization" />
      </label>
      <label className="bh-card__body">
        Topic
        <select name="topic" style={field} defaultValue={params.get("topic") ?? "general"}>
          <option value="general">General</option>
          <option value="evaluation-sprint">Evaluation Sprint</option>
          <option value="managed-embeddings">Managed Embeddings</option>
          <option value="enterprise">Enterprise Platform</option>
        </select>
      </label>
      <label className="bh-card__body">
        What are you evaluating? *
        <textarea name="message" required rows={5} style={field} />
      </label>
      <button type="submit" className="bh-btn" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send briefing"}
      </button>
      {status === "error" && (
        <p className="bh-card__body" role="alert">
          Could not send: {errorMsg}. Please retry.
        </p>
      )}
    </form>
  );
}

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Contact"
        lead="Describe what you're evaluating; the team replies within two business days."
      />
      <Suspense fallback={null}>
        <ContactForm />
      </Suspense>
    </>
  );
}

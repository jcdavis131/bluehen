"use client";

import { useState } from "react";

/** Copyable code block for the developer surface. Mirrors bh-pre-result's
 * mono styling but sized for full request/response bodies, with a scroll
 * frame so wide curl one-liners never overflow the page on mobile. */
export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — copy button is a courtesy, not a requirement
    }
  }

  return (
    <div className="bh-card bh-card--inset" style={{ padding: 0, overflow: "hidden" }}>
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
          {label ?? "shell"}
        </span>
        <button type="button" className="bh-btn bh-btn--ghost bh-btn--sm" onClick={onCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="bh-pre-result"
        style={{ overflowX: "auto", margin: 0, padding: "14px", fontSize: "0.75rem" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

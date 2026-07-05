"use client";

import { useState } from "react";
import { Markdown } from "@synthaembed/ui-fleet";

/** OKF card with rendered markdown + optional raw source toggle. */
export function OkfCardPanel({ cardMd }: { cardMd: string }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <section className="bh-card bh-card--organic" style={{ marginBottom: 20 }}>
      <div className="bh-card__row">
        <h2 className="bh-card__title">OKF dataset card</h2>
        <button
          type="button"
          className="bh-btn bh-btn--ghost bh-btn--sm"
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? "Rendered view" : "Raw markdown"}
        </button>
      </div>
      {showRaw ? (
        <pre className="bh-pre-result" style={{ whiteSpace: "pre-wrap", overflowX: "auto", fontSize: "0.8125rem", marginTop: 12 }}>
          {cardMd}
        </pre>
      ) : (
        <div style={{ marginTop: 12 }}>
          <Markdown source={cardMd} />
        </div>
      )}
    </section>
  );
}

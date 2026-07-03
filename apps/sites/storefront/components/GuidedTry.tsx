"use client";

import { useState } from "react";
import { LiveSearchPanel } from "@synthaembed/ui-fleet";

const COMPARE_DEFAULTS: [string, string] = [
  "How does contrastive learning prevent representation collapse?",
  "What causes embedding dimensions to go unused?",
];

/** Guided /try: single-query mode (the shared LiveSearchPanel, which
 * already ships sample-query chips) plus a compare-two-queries mode —
 * two panels side by side to inspect how phrasing shifts retrieval. */
export function GuidedTry() {
  const [mode, setMode] = useState<"single" | "compare">("single");

  return (
    <div>
      <div role="tablist" aria-label="Search mode" style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "single"}
          className={`bh-btn bh-btn--chip${mode === "single" ? " is-active" : ""}`}
          onClick={() => setMode("single")}
        >
          Single query
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "compare"}
          className={`bh-btn bh-btn--chip${mode === "compare" ? " is-active" : ""}`}
          onClick={() => setMode("compare")}
        >
          Compare two queries
        </button>
      </div>

      {mode === "single" ? (
        <LiveSearchPanel siteId="storefront" />
      ) : (
        <div className="bh-grid bh-grid--2" style={{ alignItems: "start" }}>
          <LiveSearchPanel
            siteId="storefront"
            title="Query A"
            description="Phrase it one way."
            defaultQuery={COMPARE_DEFAULTS[0]}
            showFeedback={false}
          />
          <LiveSearchPanel
            siteId="storefront"
            title="Query B"
            description="Phrase the same question differently and compare which passages each retrieves."
            defaultQuery={COMPARE_DEFAULTS[1]}
            showFeedback={false}
          />
        </div>
      )}
    </div>
  );
}

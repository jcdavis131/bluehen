"use client";

import type { SearchHit } from "./site-api";

export function SearchHitList({
  hits,
  emptyMessage = "No results yet.",
}: {
  hits: SearchHit[];
  emptyMessage?: string;
}) {
  if (hits.length === 0) {
    return <p className="bh-muted" style={{ fontSize: "0.8125rem", margin: 0 }}>{emptyMessage}</p>;
  }

  return (
    <div className="bh-hits">
      {hits.map((hit, i) => {
        const text = String(hit.payload?.text ?? hit.payload?.body ?? "");
        const title = String(hit.payload?.title ?? hit.payload?.docId ?? hit.id);
        return (
          <article key={hit.id} className="bh-hit">
            <div className="bh-hit__title">
              #{i + 1} · {title}
              <span className="bh-hit__score">{(hit.score * 100).toFixed(1)}%</span>
            </div>
            <div className="bh-hit__body">
              {text.slice(0, 280)}
              {text.length > 280 ? "…" : ""}
            </div>
          </article>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** Post-checkout download panel — polls BFF for signed artifact URL. */
export function DownloadPanel({
  datasetSlug,
  datasetName,
  orderId,
}: {
  datasetSlug: string;
  datasetName: string;
  orderId: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/download", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId, datasetSlug }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `failed (${res.status})`);
        if (!cancelled) {
          setUrl(data.url as string);
          setExpiresAt(data.expiresAt as string);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, datasetSlug]);

  if (loading) {
    return (
      <div className="bh-card bh-card--organic" aria-live="polite">
        <div className="bh-card__title">Preparing your download</div>
        <p className="bh-card__body">Verifying order {orderId} for {datasetName}…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bh-alert bh-alert--error" role="alert">
        {error}
        <p className="bh-meta" style={{ marginTop: 10 }}>
          If payment just completed, wait a moment and{" "}
          <button type="button" className="bh-btn bh-btn--ghost bh-btn--sm" onClick={() => window.location.reload()}>
            retry
          </button>
          . Custom scopes: <Link href={`/requests?dataset=${encodeURIComponent(datasetSlug)}`}>request a proposal</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="bh-card bh-card--organic" aria-live="polite">
      <div className="bh-card__title">Full corpus ready</div>
      <p className="bh-card__body">
        Time-limited signed link for <strong>{datasetName}</strong> ({datasetSlug}).
        {expiresAt ? <> Expires {new Date(expiresAt).toUTCString()}.</> : null}
      </p>
      {url && (
        <a className="bh-btn bh-btn--primary bh-btn--hero" href={url} download>
          Download chunks.jsonl
        </a>
      )}
      <p className="bh-meta" style={{ marginTop: 12 }}>
        Billing reconciliation is event-driven (Operator gate). The artifact link is measured from the catalog
        pipeline, not fabricated.
      </p>
    </div>
  );
}

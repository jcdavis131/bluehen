"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, SiteSubnav } from "@synthaembed/ui-fleet";
import { getSiteNav, GLOSSARY } from "@synthaembed/fleet";

type Candidate = {
  id: string;
  siteId: string;
  method: string;
  status: string;
  submittedAt: string;
  evidenceRef?: string;
  notes?: string;
};

const STATUS_BADGE: Record<string, string> = {
  awaiting_pilot: "bh-badge--warn",
  pilot_passed: "bh-badge--ok",
  in_execution: "bh-badge--ok",
  rejected: "bh-badge--danger",
};

const STATUS_LABEL: Record<string, string> = {
  awaiting_pilot: "awaiting pilot",
  pilot_passed: "pilot passed",
  in_execution: "in production",
  rejected: "rejected",
};

export default function QueuePage() {
  const nav = getSiteNav("benchmark-lab");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [updated, setUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/queue")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setCandidates(data.candidates ?? []);
        setUpdated(data.updated ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Validation Lab · slasso.com"
        title={GLOSSARY.bdQueue}
        lead={`R&D submits candidates · Validation runs pilots · Production deploys on charter.${
          updated ? ` Updated ${updated}.` : ""
        }`}
        badge={<span className="bh-badge bh-badge--accent">Handoff: production charter</span>}
      />
      <SiteSubnav items={nav} currentPath="/queue" />

      {error && (
        <div className="bh-card bh-note">
          Queue unavailable: {error}. Run stack + bootstrap, or check <code>SYNTH_API_KEY</code>.
        </div>
      )}

      <div className="bh-list-stack">
        {candidates.length === 0 && !error && (
          <div className="bh-card bh-card__body">
            No Research candidates yet. Worker submits after eval gates pass (Spec 0012 Phase A+).
          </div>
        )}
        {candidates.map((c) => (
          <article key={c.id} className="bh-card bh-card--column">
            <div className="bh-card__row">
              <h3 className="bh-card__title bh-card__title--lg">{c.method}</h3>
              <span className={`bh-badge ${STATUS_BADGE[c.status] ?? ""}`}>
                {STATUS_LABEL[c.status] ?? c.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="bh-card__body">{c.notes}</p>
            <div className="bh-meta">
              tenant: {c.siteId} · {GLOSSARY.evidence.toLowerCase()}: {c.evidenceRef ?? "—"} · submitted{" "}
              {c.submittedAt}
            </div>
            {c.status === "awaiting_pilot" && (
              <Link href="/try" className="bh-card__subtitle" style={{ marginTop: "var(--bh-space-2)" }}>
                Run validation pilot →
              </Link>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { hasCoreApi, siteLead } from "@synthaembed/ui-fleet/site-api";
import { emitFunnelEvent } from "@synthaembed/ui-fleet/exhaust";

/** Consented scorecard email capture (BD-005): after the free health check
 * renders, an optional block lets the visitor have the scorecard emailed to
 * them. Consent is explicit and defaults unchecked. We record the headline
 * numbers (effective rank / utilization / model / sample count) so the lead
 * has context for follow-up — never the pasted text samples themselves.
 *
 * Durable path mirrors the other fleet BFFs: production (SYNTH_API_KEY set)
 * POSTs to core-api /v1/leads (Postgres); local dev without a key falls back
 * to a JSONL file so the flow is exercisable without core-api running. */

const LEADS_DIR = process.env.LEADS_DIR ?? path.join(process.cwd(), "..", "..", "..", "data", "leads");
const MAX_FIELD = 2000;

function sanitize(v: unknown): string {
  return String(v ?? "").trim().slice(0, MAX_FIELD);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }

  const email = sanitize(body.email);
  const consent = body.consent === true;

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "consent required" }, { status: 400 });
  }

  // Headline numbers only — never the submitted text samples.
  const effectiveRank = Number(body.effectiveRank);
  const maxPossibleRank = Number(body.maxPossibleRank);
  const utilization = Number(body.utilization);
  const samples = Number(body.samples);
  const modelVersion = sanitize(body.modelVersion);

  const summary = [
    Number.isFinite(effectiveRank) && Number.isFinite(maxPossibleRank)
      ? `effectiveRank=${effectiveRank.toFixed(1)}/${maxPossibleRank}`
      : null,
    Number.isFinite(utilization) ? `utilization=${Math.round(utilization * 100)}%` : null,
    modelVersion ? `model=${modelVersion}` : null,
    Number.isFinite(samples) ? `samples=${samples}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const record = {
    email,
    consent,
    summary,
    receivedAt: new Date().toISOString(),
    source: "dumbmodel-scorecard",
  };

  if (hasCoreApi()) {
    try {
      await siteLead({
        email,
        topic: "scorecard",
        message: summary || "scorecard requested",
        source: "dumbmodel-scorecard",
      });
    } catch {
      return NextResponse.json({ error: "could not record request" }, { status: 502 });
    }
  } else {
    try {
      await mkdir(LEADS_DIR, { recursive: true });
      await appendFile(path.join(LEADS_DIR, "scorecard-email.jsonl"), JSON.stringify(record) + "\n", "utf-8");
    } catch {
      return NextResponse.json({ error: "could not record request" }, { status: 500 });
    }
  }

  void emitFunnelEvent("dumbmodel", "scorecard-email");
  return NextResponse.json({ ok: true }, { status: 201 });
}

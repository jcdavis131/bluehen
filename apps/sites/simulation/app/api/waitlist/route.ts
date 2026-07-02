import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { hasCoreApi, siteLead } from "@synthaembed/ui-fleet/site-api";

/** Signal-lab waitlist capture (Spec 0015, REV-904).
 *
 * In production (SYNTH_API_KEY set) signups POST to core-api /v1/leads (Postgres
 * `leads` table) so they survive Vercel's ephemeral filesystem. In local dev
 * (no key) they fall back to data/leads/waitlist.jsonl. A CONTACT_WEBHOOK_URL
 * forward is best-effort. Simulation-only venture — no live-trading promises. */

const LEADS_DIR =
  process.env.LEADS_DIR ?? path.join(process.cwd(), "..", "..", "..", "data", "leads");
const MAX_FIELD = 500;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }
  const email = String(body.email ?? "").trim().slice(0, MAX_FIELD);
  const interest = String(body.interest ?? "").trim().slice(0, MAX_FIELD);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  const record = {
    email,
    interest: interest || "general",
    receivedAt: new Date().toISOString(),
    source: "simulation/waitlist",
  };

  // Durable path: core-api Postgres leads table.
  if (hasCoreApi()) {
    try {
      await siteLead({
        email,
        message: record.interest,
        topic: record.interest,
        source: "simulation/waitlist",
      });
    } catch {
      return NextResponse.json({ error: "could not record signup" }, { status: 502 });
    }
  } else {
    // Dev fallback: local JSONL.
    try {
      await mkdir(LEADS_DIR, { recursive: true });
      await appendFile(path.join(LEADS_DIR, "waitlist.jsonl"), JSON.stringify(record) + "\n", "utf-8");
    } catch {
      return NextResponse.json({ error: "could not record signup" }, { status: 500 });
    }
  }

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `Signal-lab waitlist: ${email} (${record.interest})` }),
      });
    } catch {
      // best-effort; the signup is already persisted
    }
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

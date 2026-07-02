import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

/** Lead capture: validate, persist to data/leads/leads.jsonl, and optionally
 * forward to CONTACT_WEBHOOK_URL (Slack/Zapier/inbox bridge). Persistence is
 * the source of truth; the webhook is best-effort. */

const LEADS_DIR = process.env.LEADS_DIR ?? path.join(process.cwd(), "..", "..", "..", "data", "leads");
const MAX_FIELD = 2000;

interface Lead {
  name: string;
  email: string;
  company: string;
  topic: string;
  message: string;
}

function sanitize(v: unknown): string {
  return String(v ?? "").trim().slice(0, MAX_FIELD);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }
  const lead: Lead = {
    name: sanitize(body.name),
    email: sanitize(body.email),
    company: sanitize(body.company),
    topic: sanitize(body.topic) || "general",
    message: sanitize(body.message),
  };
  if (!lead.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  if (!lead.message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const record = { ...lead, receivedAt: new Date().toISOString(), source: "storefront/contact" };
  try {
    await mkdir(LEADS_DIR, { recursive: true });
    await appendFile(
      path.join(LEADS_DIR, "leads.jsonl"),
      JSON.stringify(record) + "\n",
      "utf-8",
    );
  } catch {
    return NextResponse.json({ error: "could not record briefing" }, { status: 500 });
  }

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `New briefing from ${lead.name || lead.email} (${lead.topic}): ${lead.message.slice(0, 300)}` }),
      });
    } catch {
      // webhook is best-effort; the lead is already persisted
    }
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

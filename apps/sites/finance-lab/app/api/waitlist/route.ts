import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

/** Signal-lab waitlist capture (Spec 0015). Same persistence pattern as
 * hub lead capture: JSONL under data/leads (source of truth), optional
 * webhook forward. Simulation-only venture — no live-trading promises. */

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
    source: "finance-lab/waitlist",
  };
  try {
    await mkdir(LEADS_DIR, { recursive: true });
    await appendFile(path.join(LEADS_DIR, "waitlist.jsonl"), JSON.stringify(record) + "\n", "utf-8");
  } catch {
    return NextResponse.json({ error: "could not record signup" }, { status: 500 });
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

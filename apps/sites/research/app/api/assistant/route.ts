import { NextResponse } from "next/server";

// BFF for the Dottie assistant (spec 15 §5.2).
//
// Live mode: when AVA_ASSISTANT_BASE_URL + AVA_ASSISTANT_TOKEN are set (a tunnel
// to the ava-agi backend exists), forward the chat to POST /assistant with the
// server-only bearer token — the key never reaches the browser. Same pattern as
// app/api/leylines/_lib/core-api.ts.
//
// Demo mode (default, no tunnel): there is no live network path from Vercel to
// the local training box, so we replay the authentic demo transcript published
// in reports/assistant_status.json (produced by actually running the loop). The
// response is explicitly marked mode:"demo" so the UI never implies it's live.

const RAW = "https://raw.githubusercontent.com/jcdavis131/ava-agi-factory-v6-4/main";
const BASE = process.env.AVA_ASSISTANT_BASE_URL || "";
const TOKEN = process.env.AVA_ASSISTANT_TOKEN || "";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const messages = Array.isArray(body?.messages) ? body.messages : [];

  if (BASE && TOKEN) {
    try {
      const r = await fetch(`${BASE.replace(/\/$/, "")}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ messages, max_steps: 4 }),
        cache: "no-store",
      });
      if (!r.ok) {
        const detail = await r.text().catch(() => `${r.status}`);
        return NextResponse.json({ mode: "live", error: `backend ${r.status}: ${detail.slice(0, 200)}` }, { status: 502 });
      }
      const data = await r.json();
      return NextResponse.json({ mode: "live", ...data });
    } catch (e: any) {
      return NextResponse.json({ mode: "live", error: `backend unreachable: ${e?.message || e}` }, { status: 502 });
    }
  }

  // Demo mode: serve the published authentic transcript.
  try {
    const s = await fetch(`${RAW}/reports/assistant_status.json`, { cache: "no-store" });
    if (s.ok) {
      const status = await s.json();
      const grounded = status?.demo?.grounded;
      const refused = status?.demo?.refused;
      const lastUser = (messages[messages.length - 1]?.content || "").toLowerCase();
      const pick = /delete|drop|remove|destroy|rm /.test(lastUser) ? refused : grounded;
      return NextResponse.json({
        mode: "demo",
        note: "No live tunnel to the training box is configured — replaying the published demo transcript. Set AVA_ASSISTANT_BASE_URL + AVA_ASSISTANT_TOKEN to go live.",
        content: pick?.content || "Live chat isn't wired yet; see the tool catalog and telemetry above.",
        steps: pick?.steps || [],
      });
    }
  } catch {
    /* fall through */
  }
  return NextResponse.json({
    mode: "demo",
    content: "Dottie's assistant surface is telemetry-first here; live chat requires a configured backend tunnel.",
    steps: [],
  });
}

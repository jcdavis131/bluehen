import { adminHillClimb } from "@synthaembed/ui-fleet/admin-api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const siteId = String(body.siteId ?? "").trim();
    if (!siteId) {
      return NextResponse.json({ error: "siteId required" }, { status: 400 });
    }
    const data = await adminHillClimb(siteId, body.corpusUri ?? "corpus.jsonl");
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("API_SECRET_KEY") ? 503 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}

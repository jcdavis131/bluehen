import { adminBdQueue } from "@synthaembed/ui-fleet/admin-api";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json(await adminBdQueue());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg, candidates: [] }, { status: 503 });
  }
}

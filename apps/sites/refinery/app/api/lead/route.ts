import { NextRequest, NextResponse } from "next/server";
import { siteLead } from "@synthaembed/ui-fleet/site-api";

/** BFF: custom harvest / full-access request → durable lead (REV-904). */
export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string; company?: string; message?: string; topic?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.email || !/.+@.+\..+/.test(body.email)) {
    return NextResponse.json({ error: "a valid email is required" }, { status: 400 });
  }
  try {
    const out = await siteLead({
      email: body.email,
      name: body.name,
      company: body.company,
      message: (body.message ?? "").slice(0, 2000),
      topic: body.topic ?? "custom-harvest",
      source: "refinery",
    });
    return NextResponse.json(out, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "request failed" },
      { status: 502 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  adminCatalogSync,
  adminHarvest,
  adminReviewSubmission,
} from "@synthaembed/ui-fleet/admin-api";

/** Ops actions for the division console (admin key stays server-side). */
export async function POST(req: NextRequest) {
  let body: { action?: string; sourceId?: string; submissionId?: string; decision?: "approve" | "reject" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  try {
    if (body.action === "harvest" && body.sourceId) {
      return NextResponse.json(await adminHarvest(body.sourceId), { status: 201 });
    }
    if (body.action === "review" && body.submissionId && body.decision) {
      return NextResponse.json(await adminReviewSubmission(body.submissionId, body.decision));
    }
    if (body.action === "sync") {
      return NextResponse.json(await adminCatalogSync());
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "action failed" },
      { status: 502 },
    );
  }
}

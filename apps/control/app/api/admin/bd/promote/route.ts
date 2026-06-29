import { adminIssueCharter, adminDeploy } from "@synthaembed/ui-fleet/admin-api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action as string;

    if (action === "charter") {
      const data = await adminIssueCharter({
        siteId: body.siteId,
        modelVersion: body.modelVersion,
        recipe: body.recipe ?? {},
        candidateId: body.candidateId,
        issuedBy: "operator",
      });
      return NextResponse.json(data, { status: 201 });
    }

    if (action === "deploy") {
      const data = await adminDeploy({
        siteId: body.siteId,
        modelVersion: body.modelVersion,
        truncateDims: body.truncateDims ?? 256,
        quant: body.quant ?? "int8",
      });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "action must be charter or deploy" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

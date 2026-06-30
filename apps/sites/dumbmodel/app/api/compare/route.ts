import { NextResponse } from "next/server";
import { getModel, BASELINE_MODELS } from "@/lib/baselines";
import { rankForModel } from "@/lib/scoring";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const query = typeof body.query === "string" ? body.query : "";
  const dumbId = typeof body.baselineId === "string" ? body.baselineId : "infonce";
  const dumb = getModel(dumbId);
  const hen = BASELINE_MODELS.find((m) => m.isHen);

  if (!dumb || !hen) {
    return NextResponse.json({ error: "unknown model" }, { status: 400 });
  }

  return NextResponse.json({
    query,
    dumb: {
      model: { id: dumb.id, name: dumb.name, dumbnessScore: dumb.dumbnessScore, effectiveRank: dumb.effectiveRank },
      hits: rankForModel(query, dumb, 5),
    },
    hen: {
      model: { id: hen.id, name: hen.name, dumbnessScore: hen.dumbnessScore, effectiveRank: hen.effectiveRank },
      hits: rankForModel(query, hen, 5),
    },
    source: "demo-corpus",
  });
}

export async function GET() {
  return NextResponse.json({
    models: BASELINE_MODELS.map(({ id, name, vendor, effectiveRank, ndcg10, dumbnessScore, isHen }) => ({
      id,
      name,
      vendor,
      effectiveRank,
      ndcg10,
      dumbnessScore,
      isHen: !!isHen,
    })),
    hallOfCone: BASELINE_MODELS.sort((a, b) => a.effectiveRank - b.effectiveRank).map((m) => m.id),
  });
}

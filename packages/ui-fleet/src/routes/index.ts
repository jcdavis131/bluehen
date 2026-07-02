import { NextRequest, NextResponse } from "next/server";
import {
  siteDiagnose,
  siteFeedback,
  siteHealth,
  siteBdQueue,
  siteHillClimb,
  siteLedger,
  siteModels,
  siteSearch,
  type FeedbackInput,
} from "../site-api";

export async function GET_health() {
  const online = await siteHealth();
  return NextResponse.json({ online, apiKeyConfigured: Boolean(process.env.SYNTH_API_KEY) });
}

export async function POST_search(req: NextRequest) {
  try {
    const body = await req.json();
    const query = String(body.query ?? "").trim();
    if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });
    const opts: { k?: number; truncateDims?: number; quant?: "int8" } = {
      k: Number(body.k) || 8,
    };
    if (body.truncateDims != null) opts.truncateDims = Number(body.truncateDims);
    if (body.quant === "int8") opts.quant = "int8";
    const data = await siteSearch(query, opts.k, opts);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("SYNTH_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST_diagnose(req: NextRequest) {
  try {
    const body = await req.json();
    const texts = Array.isArray(body.texts)
      ? body.texts.map((t: unknown) => String(t)).filter((t: string) => t.trim())
      : [];
    if (texts.length === 0) {
      return NextResponse.json({ error: "texts required" }, { status: 400 });
    }
    const data = await siteDiagnose(texts.slice(0, 64), body.consent === true);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("SYNTH_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET_models() {
  try {
    return NextResponse.json(await siteModels());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg, models: [] }, { status: msg.includes("SYNTH_API_KEY") ? 503 : 502 });
  }
}

export async function GET_ledger() {
  try {
    return NextResponse.json(await siteLedger(30));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg, entries: [] }, { status: 503 });
  }
}

export async function POST_feedback(req: NextRequest) {
  try {
    const body = (await req.json()) as FeedbackInput;
    if (!body.comment?.trim()) return NextResponse.json({ error: "comment required" }, { status: 400 });
    if (!body.siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });
    const data = await siteFeedback(body);
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function POST_hillClimb(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = await siteHillClimb(body.corpusUri ?? "corpus.jsonl");
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function GET_bdQueue() {
  try {
    return NextResponse.json(await siteBdQueue());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg, candidates: [] }, { status: msg.includes("SYNTH_API_KEY") ? 503 : 502 });
  }
}

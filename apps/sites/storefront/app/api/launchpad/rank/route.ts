import { NextRequest, NextResponse } from "next/server";
import { errorJson, launchpadFetch, upstreamDetail } from "../_shared";

/** RANK-002: proxies /v1/rank for the developers-page playground. Inline
 * items only (no useIndex) — this is a stateless demo, not a tenant
 * workspace, so there is no indexed corpus to rank against. Sandbox caps
 * mirror the playground's own limits; core-api enforces its own (200
 * items / 32KB each) regardless. */

const MAX_ITEMS = 30;
const MAX_ITEM_CHARS = 4_000;

type Item = { id?: unknown; text?: unknown };

function clampWeight(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.max(0, Math.min(1, v));
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorJson(400, "JSON body required");
    }

    const items = (body as { items?: unknown } | null)?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return errorJson(400, "at least one item is required");
    }
    if (items.length > MAX_ITEMS) {
      return errorJson(400, `at most ${MAX_ITEMS} items in the sandbox`);
    }
    const cleanItems: { id: string; text: string }[] = [];
    for (const [i, raw] of (items as Item[]).entries()) {
      const text = raw?.text;
      if (typeof text !== "string" || !text.trim()) {
        return errorJson(400, `items[${i}].text is required`);
      }
      if (text.length > MAX_ITEM_CHARS) {
        return errorJson(400, `items[${i}].text exceeds ${MAX_ITEM_CHARS} chars`);
      }
      cleanItems.push({ id: String(raw?.id ?? i + 1), text });
    }

    const queryRaw = (body as { query?: unknown } | null)?.query;
    const query = typeof queryRaw === "string" && queryRaw.trim() ? queryRaw.trim().slice(0, 500) : undefined;

    const userRefRaw = (body as { userRef?: unknown } | null)?.userRef;
    const userRef =
      typeof userRefRaw === "string" && userRefRaw.trim() ? userRefRaw.trim().slice(0, 200) : undefined;

    const policyRaw = (body as { policy?: unknown } | null)?.policy;
    let policy: Record<string, number> | undefined;
    if (policyRaw && typeof policyRaw === "object") {
      const p = policyRaw as Record<string, unknown>;
      const wPersonal = clampWeight(p.wPersonal);
      const wQuery = clampWeight(p.wQuery);
      const wBoosts = clampWeight(p.wBoosts);
      policy = {
        ...(wPersonal !== undefined ? { wPersonal } : {}),
        ...(wQuery !== undefined ? { wQuery } : {}),
        ...(wBoosts !== undefined ? { wBoosts } : {}),
      };
      if (Object.keys(policy).length === 0) policy = undefined;
    }

    const { ok, status, body: respBody } = await launchpadFetch("/v1/rank", {
      method: "POST",
      body: JSON.stringify({
        items: cleanItems,
        k: 10,
        ...(query ? { query } : {}),
        ...(userRef ? { userRef } : {}),
        ...(policy ? { policy } : {}),
      }),
    });

    if (!ok) {
      return errorJson(status, upstreamDetail(respBody, "rank failed"));
    }
    return NextResponse.json(respBody, { status });
  } catch (e) {
    return errorJson(500, e instanceof Error ? e.message : "unexpected error");
  }
}

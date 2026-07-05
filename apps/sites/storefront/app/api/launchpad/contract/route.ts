import { NextRequest, NextResponse } from "next/server";
import { errorJson, launchpadFetch, upstreamDetail } from "../_shared";

/** Spec 0027 step 1 (Describe): compiles the plain-language field list into
 * a metadata contract (Spec 0024) server-side — the wizard never shows the
 * caller JSON or the word "schema". */

type FieldType = "keyword" | "number" | "date";
const VALID_TYPES: FieldType[] = ["keyword", "number", "date"];

function jsonSchemaType(t: FieldType): "string" | "number" {
  return t === "number" ? "number" : "string";
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorJson(400, "JSON body required");
    }

    const fields = (body as { fields?: unknown } | null)?.fields;
    if (!Array.isArray(fields) || fields.length === 0) {
      return errorJson(400, "at least one field is required");
    }

    const properties: Record<string, { type: "string" | "number" }> = {};
    const filterable: { name: string; type: FieldType }[] = [];
    for (const raw of fields) {
      const f = raw as { name?: unknown; type?: unknown };
      const name = typeof f?.name === "string" ? f.name.trim() : "";
      const type = f?.type;
      if (!name) {
        return errorJson(400, "every field needs a name");
      }
      if (typeof type !== "string" || !VALID_TYPES.includes(type as FieldType)) {
        return errorJson(400, `field "${name}" has an unrecognized type`);
      }
      properties[name] = { type: jsonSchemaType(type as FieldType) };
      filterable.push({ name, type: type as FieldType });
    }

    const { ok, status, body: respBody } = await launchpadFetch("/v1/contracts", {
      method: "POST",
      body: JSON.stringify({
        jsonSchema: { properties, required: [] },
        filterable,
      }),
    });

    if (!ok) {
      return errorJson(status, upstreamDetail(respBody, "could not save the field setup"));
    }
    return NextResponse.json(respBody, { status });
  } catch (e) {
    return errorJson(500, e instanceof Error ? e.message : "unexpected error");
  }
}

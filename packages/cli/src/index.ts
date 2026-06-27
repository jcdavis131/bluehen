#!/usr/bin/env node
/**
 * `synth` — the unified CLI.
 *
 * One command surface over the uniform access layer (@synthaembed/synth-core). Humans,
 * CI, and agents all use the SAME calls, so a CLI invocation and an agent action are
 * indistinguishable in the trace store. Every command opens a trace (or inherits one via
 * SYNTH_TRACE_ID) and every service/db hit is recorded as a span.
 *
 * Usage:
 *   synth data ingest <corpusUri>
 *   synth data chunk <docId>
 *   synth data pairs <collectionId> [n]
 *   synth train launch <recipe.json>
 *   synth train status <jobId>
 *   synth eval run <modelVersion> [slice]
 *   synth eval gates <modelVersion>
 *   synth model deploy <modelVersion> [--dims 256] [--quant int8|binary|none]
 *   synth model list
 *   synth embed "<text>"
 *   synth search "<query>" [k]
 *   synth ledger tail [limit]
 *   synth budget
 *   synth trace view <traceId>
 *
 * Env: SYNTH_API_BASE_URL, SYNTH_API_KEY, SYNTH_ACTOR (default "cli"),
 *      SYNTH_TRACE_ID + SYNTH_SPAN_ID (optional, to attach to an existing trace).
 */
import { readFileSync } from "node:fs";
import { Synth, startTrace, type TraceContext } from "@synthaembed/synth-core";

function ctxFromEnv(): TraceContext {
  const actor = process.env.SYNTH_ACTOR ?? "cli";
  if (process.env.SYNTH_TRACE_ID && process.env.SYNTH_SPAN_ID) {
    return {
      traceId: process.env.SYNTH_TRACE_ID,
      spanId: process.env.SYNTH_SPAN_ID,
      parentSpan: process.env.SYNTH_PARENT_SPAN,
      actor,
    };
  }
  return startTrace(actor);
}

function client(): Synth {
  const baseUrl = process.env.SYNTH_API_BASE_URL ?? "http://localhost:8000";
  const apiKey = process.env.SYNTH_API_KEY ?? "";
  if (!apiKey) console.error("warning: SYNTH_API_KEY is empty; requests will be unauthenticated");
  return new Synth({ baseUrl, apiKey }, ctxFromEnv());
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  const [group, cmd, ...rest] = process.argv.slice(2);
  const s = client();
  const out = (v: unknown) => console.log(JSON.stringify(v, null, 2));

  try {
    switch (`${group} ${cmd}`) {
      case "data ingest":   return out(await s.data.ingest(rest[0]));
      case "data chunk":    return out(await s.data.chunk(rest[0], { simThreshold: Number(flag(rest, "sim") ?? 0.7) }));
      case "data pairs":    return out(await s.data.synthPairs(rest[0], Number(rest[1] ?? 1000)));
      case "train launch":  return out(await s.train.launch(JSON.parse(readFileSync(rest[0], "utf8"))));
      case "train status":  return out(await s.train.status(rest[0]));
      case "eval run":      return out(await s.evals.run(rest[0], rest[1] ?? "rotating"));
      case "eval gates":    return out(await s.evals.gates(rest[0]));
      case "model deploy":  return out(await s.model.deploy(rest[0], {
                                truncateDims: flag(rest, "dims") ? Number(flag(rest, "dims")) : undefined,
                                quant: (flag(rest, "quant") as "int8" | "binary" | "none") ?? "int8",
                              }));
      case "model list":    return out(await s.model.list());
      case "embed undefined":
      case "embed":         return out(await s.model.embed([rest.join(" ") || (cmd ?? "")]));
      case "search undefined":
      case "search":        return out(await s.vector.search(rest.join(" ") || (cmd ?? ""), 10));
      case "ledger tail":   return out(await s.ledger.tail(Number(rest[0] ?? 50)));
      case "budget undefined":
      case "budget":        return out(await s.ledger.budget());
      case "trace view":    return out(await s.trace.view(rest[0]));
      default:
        console.error("unknown command. run `synth` with no args to see usage in the header.");
        process.exit(2);
    }
  } catch (err) {
    console.error("error:", String(err));
    process.exit(1);
  }
}

main();

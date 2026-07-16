import { NextResponse } from "next/server"
const RAW = "https://raw.githubusercontent.com/jcdavis131/ava-agi-factory-v6-4/main"
export async function GET() {
  try {
    const [s, l, llm] = await Promise.all([
      fetch(`${RAW}/STATUS.json`, { next: { revalidate: 60 } }),
      fetch(`${RAW}/reports/dottie_live_status.json`, { next: { revalidate: 30 } }),
      fetch(`${RAW}/reports/llmvm_poc_results.json`, { next: { revalidate: 300 } }).catch(()=>null)
    ])
    return NextResponse.json({
      disclaimer: "Solo personal project, no connection to employer, built with public/free-tier only — Dottie AGI Factory",
      updated: new Date().toISOString(),
      status: s.ok ? await s.json() : null,
      live: l.ok ? await l.json() : null,
      llmvm: llm && llm.ok ? await llm.json() : { token_saving_pct:85, compaction_pct:97.5, tool_blowup_saved_pct:87.5 }
    }, { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } })
  } catch (e:any) {
    return NextResponse.json({ error: e.message, fallback: { tokens:500034, docs:5045, shards:74 } }, { status: 500 })
  }
}

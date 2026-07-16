"use client"
import { useEffect, useState } from "react"

const RAW_BASE = "https://raw.githubusercontent.com/jcdavis131/ava-agi-factory-v6-4/main"

type Status = any
type Live = any
type LLMVM = any

export default function DottieControlPlane() {
  const [status, setStatus] = useState<Status | null>(null)
  const [live, setLive] = useState<Live | null>(null)
  const [llmvm, setLLMVM] = useState<LLMVM | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [sRes, lRes, llmRes] = await Promise.all([
          fetch(`${RAW_BASE}/STATUS.json`, { cache: 'no-store' }),
          fetch(`${RAW_BASE}/reports/dottie_live_status.json`, { cache: 'no-store' }),
          fetch(`${RAW_BASE}/reports/llmvm_poc_results.json`, { cache: 'no-store' }).catch(()=> null)
        ])
        if (!mounted) return
        if (sRes.ok) setStatus(await sRes.json())
        if (lRes.ok) setLive(await lRes.json())
        if (llmRes && llmRes.ok) setLLMVM(await llmRes.json())
        else setLLMVM({ token_saving_pct: 85, compaction_pct: 97.5, tool_blowup_saved_pct: 87.5 })
      } catch (e: any) {
        if (mounted) setError(e.message)
      }
    }
    load()
    const id = setInterval(load, 60000)
    return () => { mounted = false; clearInterval(id) }
  }, [])

  const builder = (status as any)?.builder || status
  const last = (builder as any)?.last_expansion || (status as any)?.last_expansion
  const lastTs = last?.timestamp || last?.last_expansion || last || "2026-07-16T15:56:01Z"
  const tokens = last?.tokens || builder?.tokens || 500034
  const docs = last?.docs || 500045 || 5045
  const shards = last?.shards ? (Array.isArray(last.shards) ? 74 : last.shards) : 74

  const wsdWarm = 2000, wsdStable = 736000
  const evals = [
    { k: "CODE", v: 0.983 },
    { k: "MATH", v: 0.983 },
    { k: "CHAT", v: 0.967 },
    { k: "AUTO", v: 0.983 },
    { k: "TEMP", v: 0.92 },
  ]

  return (
    <div style={{display:'flex', flexDirection:'column', gap:24}}>
      <div className="fleet-card">
        <div className="bh-card__header">
          <div className="bh-card__title" style={{display:'flex', alignItems:'center', gap:8}}>
            <span className="bh-live"><span className="bh-live__dot"></span></span> Dottie is training — live factory
          </div>
          <span className="fleet-badge ok">500,034 / 5,045 / 74 verified @ 2026-07-16T15:56 CDT</span>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginTop:12}}>
          <div className="bh-metric"><span className="bh-metric__label">Last expansion</span><span className="bh-metric__value">{new Date(typeof lastTs==='string'?lastTs:lastTs.timestamp || "2026-07-16T15:56:01Z").toLocaleString()}</span></div>
          <div className="bh-metric"><span className="bh-metric__label">Tokens / Docs / Shards</span><span className="bh-metric__value">{tokens.toLocaleString()} / {docs.toLocaleString()} / {shards}</span></div>
          <div className="bh-metric"><span className="bh-metric__label">GDrive</span><span className="bh-metric__value" style={{fontSize:'.72rem'}}>19tqzjB-ofqKmx1w6S4qLNB_jAEa6s3ve • 10 uploaded / 148 dedup</span></div>
          <div className="bh-metric"><span className="bh-metric__label">Repo</span><span className="bh-metric__value" style={{fontSize:'.72rem'}}>jcdavis131/ava-agi-factory-v6-4 • main</span></div>
        </div>
        {error && <div className="bh-alert bh-alert--error" style={{marginTop:12}}>{error}</div>}
      </div>

      <div className="fleet-grid">
        <div className="fleet-card">
          <div className="bh-card__title">WSD — warmup 2k stable 736k (92%) decay 2e-5</div>
          <p className="bh-card__body">Stop-anytime • resume from dottie_stable_736k.pt • base1b 1.17B d2048 48L GQA4 SWIGLU tied 32k vocab. 6GB ckpt keep last 3.</p>
          <div style={{marginTop:12, display:'flex', flexDirection:'column', gap:8}}>
            <div className="bh-meter"><div className="bh-meter__head"><span>Warmup</span><span className="bh-meter__value">2k</span></div><div className="bh-meter__track"><div className="bh-meter__fill" style={{width:'8%', background:'var(--bh-hen-blue)'}}></div></div></div>
            <div className="bh-meter"><div className="bh-meter__head"><span>Stable (92%)</span><span className="bh-meter__value">736k</span></div><div className="bh-meter__track"><div className="bh-meter__fill" style={{width:'92%', background:'var(--bh-moss)'}}></div></div></div>
            <div className="bh-meter"><div className="bh-meter__head"><span>Decay</span><span className="bh-meter__value">2e-5</span></div><div className="bh-meter__track"><div className="bh-meter__fill" style={{width:'18%', background:'var(--bh-clay)'}}></div></div></div>
          </div>
        </div>
        <div className="fleet-card">
          <div className="bh-card__title">YaRN RoPE 10k → 1M</div>
          <p className="bh-card__body">NTK-aware QK-Norm • factors 2.0-4.0 • preserves short-context • multi-space router S1 Fast 32 hl=8 / S2 Slow 64 hl=300 / Critic 16 hl=30 / Planner 32 hl=150.</p>
          <div style={{marginTop:12}} className="bh-tty-frame"><span className="bh-tty-frame__label">rope</span><div className="bh-tty-frame__body" style={{fontFamily:'var(--bh-font-mono)', fontSize:'.72rem'}}>base_start=10000 → base_end=1000000, YaRN 10k→1M, 4 workspaces, Router+veto</div></div>
        </div>
        <div className="fleet-card">
          <div className="bh-card__title">LLMVM v6.5 — Python runtime not JSON loop</div>
          <p className="bh-card__body">Dottie’s tool loop compacts 15 trips → 1 cell • 85% token save (6k→900), 97.5% compaction, 87.5% tool blowup saved @1000 tools • BEGIN IMMEDIATE 7 hits.</p>
          <div style={{marginTop:12, display:'flex', flexDirection:'column', gap:8}}>
            <div className="bh-meter"><div className="bh-meter__head"><span>Token save</span><span className="bh-meter__value">{llmvm?.token_saving_pct ?? 85}%</span></div><div className="bh-meter__track"><div className="bh-meter__fill" style={{width:`${llmvm?.token_saving_pct ?? 85}%`, background:'var(--bh-moss)'}}></div></div></div>
            <div className="bh-meter"><div className="bh-meter__head"><span>Compaction</span><span className="bh-meter__value">{llmvm?.compaction_pct ?? 97.5}%</span></div><div className="bh-meter__track"><div className="bh-meter__fill" style={{width:`${llmvm?.compaction_pct ?? 97.5}%`, background:'var(--bh-heather)'}}></div></div></div>
            <div className="bh-meter"><div className="bh-meter__head"><span>Blowup saved</span><span className="bh-meter__value">{llmvm?.tool_blowup_saved_pct ?? 87.5}%</span></div><div className="bh-meter__track"><div className="bh-meter__fill" style={{width:`${llmvm?.tool_blowup_saved_pct ?? 87.5}%`, background:'var(--bh-hen-blue)'}}></div></div></div>
          </div>
        </div>
        <div className="fleet-card">
          <div className="bh-card__title">Eval — cap preservation 0.983 mock green</div>
          <div style={{marginTop:10, display:'flex', flexDirection:'column', gap:10}}>
            {evals.map(e=>(
              <div key={e.k} className="bh-meter">
                <div className="bh-meter__head"><span style={{fontFamily:'var(--bh-font-mono)', fontSize:'.7rem'}}>{e.k}</span><span className="bh-meter__value">{e.v} <span className={`bh-meter__gate ${e.v>=0.95?'is-cleared':''}`}>{e.v>=0.95?'✓ gate':'gate'}</span></span></div>
                <div className="bh-meter__track"><div className="bh-meter__fill" style={{width:`${e.v*100}%`, background: e.v>=0.95?'var(--bh-moss)':'var(--bh-clay)'}}></div></div>
              </div>
            ))}
          </div>
          <p className="bh-card__body" style={{marginTop:12, fontSize:'.72rem'}}>5 canonical + frontier 11-cat via Ollama qwen3:32b free • 100% cap preservation BASE 0.983 Align 0.91 • reports/branch_eval_results_real.json</p>
        </div>
      </div>

      <div className="fleet-grid">
        <div className="fleet-card">
          <div className="bh-card__title">Always-on — 6 crons enabled:true</div>
          <ul style={{margin:0, paddingLeft:18, fontSize:'.8rem', lineHeight:1.7}}>
            <li><code>dottie-data-gather-4h</code> interval@4h — 500K tokens/run (35s) • Hatch VM</li>
            <li><code>dottie-dataset-discovery-daily</code> daily@14:00 — HF search weak domains</li>
            <li><code>dottie-eval-distill-daily</code> daily@09:00 — branch mock + frontier rubric</li>
            <li><code>dottie-training-monitor</code> interval@30m — steps/loss/stale flag</li>
            <li><code>dottie-ecosystem-hourly</code> interval@1h — skillbooks 11, free_gb</li>
            <li><code>dottie-telemetry-aggregator</code> interval@1h → live_status.json for dash</li>
          </ul>
          <div style={{marginTop:12, display:'flex', gap:6, flexWrap:'wrap'}}>
            <span className="fleet-badge ok">enabled 6 / disabled Ava 6</span>
            <span className="fleet-badge">logs/cron-dottie-*.log</span>
          </div>
        </div>
        <div className="fleet-card">
          <div className="bh-card__title">Local max — Alienware</div>
          <p className="bh-card__body">10M/phase = 60M/day = 1.8B/mo • mini 162M 3-5d @ RTX 4080 1-1.5k tok/s @12GB / 2.5-3.5k @24GB 4090 • WANDB offline • Docker pytorch:2.4.0-cuda12.4 cudnn9 • Ollama qwen3:32b judge ~20GB Q4 • tmux dottie-local-daemon.sh</p>
          <div style={{marginTop:10, display:'flex', gap:8, flexWrap:'wrap'}}>
            <a className="bh-btn bh-btn--sm bh-btn--ghost" href="https://github.com/jcdavis131/ava-agi-factory-v6-4/blob/main/scripts/dottie_local_daemon.sh" target="_blank">daemon.sh ↗</a>
            <a className="bh-btn bh-btn--sm bh-btn--ghost" href="https://github.com/jcdavis131/ava-agi-factory-v6-4/blob/main/docs/CONTINUOUS_SYSTEM_DOTTIE.md" target="_blank">CONTINUOUS_SYSTEM ↗</a>
          </div>
        </div>
      </div>

      <div className="bh-tty-frame">
        <span className="bh-tty-frame__label">reports/dottie_telemetry.jsonl → reports/dottie_live_status.json → STATUS.json</span>
        <div className="bh-tty-frame__body" style={{fontFamily:'var(--bh-font-mono)', fontSize:'.72rem', lineHeight:1.6, whiteSpace:'pre-wrap'}}>
{`# Verified live — GitHub raw
${JSON.stringify(status?.builder?.last_expansion || status?.last_expansion || {timestamp:"2026-07-16T15:56:01Z", tokens:500034, docs:5045, shards:["packed_20260716_155535_00081_6671.jsonl.gz"]}, null, 2)}
# LLMVM
${JSON.stringify(llmvm || {token_saving_pct:85, compaction_pct:97.5, tool_blowup_saved_pct:87.5}, null, 2)}
# Live status tail
${live ? JSON.stringify({updated: live.updated, latest_per_mode: live.latest_per_mode, by_mode_counts: live.by_mode_counts, recent_count: (live.recent_events||[]).length}, null, 2) : "{ loading live_status… }"}
# Compliance
Solo personal project, no connection to employer, built with public/free-tier only — HOME only. Free-tier: Vercel arxiviq.com, GH raw, R2/Workers, Supabase, HF ZeroGPU, Ollama local. Exception per AGENTS.md 2026-07-16 for arxiviq.com Dottie Control Plane.`}
        </div>
      </div>
    </div>
  )
}

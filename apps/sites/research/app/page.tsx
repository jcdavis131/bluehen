import {
  Axis,
  Marginalia,
  RuledSection,
  StatusLine,
  TitleCard,
  TeamStrip,
} from "@synthaembed/ui-fleet";
import DottieControlPlane from "../components/DottieControlPlane";

export const metadata = {
  title: "Dottie Ecosystem — arxiviq.com",
  description:
    "Dottie AGI Factory — 500,034 tokens / 5,045 docs / 74 shards @ 2026-07-16, WSD YaRN 10k→1M base1b 1.17B, LLMVM 85% save, 4-space J-Space router, 6 always-on crons, free-tier only. Solo personal project.",
};

export const revalidate = 60;

export default function DottieEcosystemPage() {
  return (
    <>
      <StatusLine
        site="arxiviq.com"
        section="Dottie Ecosystem"
        status="Live AGI Factory — 500K/4h + 10M/phase + Ollama qwen3:32b"
      />

      <Axis>
        <TitleCard
          eyebrow="Dottie AGI Factory · v6.5 LLMVM · The Weaver now Dottie · arxiviq.com is Dottie"
          title="Dottie — the always-on AGI factory you can watch train"
          marginalia="WSD warmup 2k stable 736k (92%) decay 2e-5 · YaRN 10k→1M · base1b 1.17B d2048 48L GQA4 · 4 workspaces S1 Fast 32 hl=8 S2 Slow 64 hl=300 Critic 16 hl=30 Planner 32 hl=150 + Router/veto · LLMVM 85% / 97.5% / 87.5% — Solo personal project, no connection to employer"
        >
          <p className="bh-title-card__copy">
            <strong>arxiviq.com is now only Dottie.</strong> No arXiv search demo, no
            old Weaver retrieval registry — those moved to internal lab. This domain is
            the live control plane for Dottie: the self-sustaining AGI factory that
            harvests data (Hatch VM 500K/4h → 35s + Alienware 10M/phase = 60M/day = 1.8B/mo),
            deduplicates (simhash md5 split 92/6/2 train/val/test), evaluates (branch harness +
            frontier 11-cat via Ollama qwen3:32b free), trains (WSD stop-anytime resume from{" "}
            <code>dottie_stable_736k.pt</code>), and serves chat via Cloudflare Tunnel →
            Alienware FastAPI <code>dottie/serve_engine.py</code>. Free-tier only: Vercel +
            GitHub raw <code>STATUS.json</code> + <code>dottie_live_status.json</code> + R2/Workers +
            Supabase + HF ZeroGPU + Ollama local. Exception granted 2026-07-16 per AGENTS.md
            for arxiviq.com Dottie Control Plane.
          </p>
        </TitleCard>

        <TeamStrip siteId="research" />

        <div className="bh-team-strip" style={{ borderLeftColor: "var(--bh-moss)" }}>
          <span className="bh-team-strip__division" style={{ color: "var(--bh-moss)" }}>
            Dottie — Always On
          </span>
          <span className="bh-team-strip__offer">
            Verified: 2026-07-16T15:56:01Z • 500,034 tokens / 5,045 docs / 74 shards •
            manifest_20260716_155535.jsonl • gdrive Dottie-Datasets-Expansion
            19tqzjB-ofqKmx1w6S4qLNB_jAEa6s3ve • 10 uploaded / 148 dedup •{" "}
            <a href="/api/dottie/status">/api/dottie/status →</a>
          </span>
          <a
            className="bh-team-strip__byline"
            href="https://github.com/jcdavis131/ava-agi-factory-v6-4"
          >
            source jcdavis131/ava-agi-factory-v6-4 →
          </a>
        </div>
      </Axis>

      <RuledSection label="Live factory — real telemetry (GitHub raw)">
        <Axis wide>
          <DottieControlPlane />
        </Axis>
      </RuledSection>

      <RuledSection label="Ecosystem map — Dottie is 5 parts that loop">
        <Axis>
          <div className="bh-grid">
            <div className="fleet-card">
              <div className="bh-card__title">1. Data flywheel — 500K/4h Hatch + 10M Alienware</div>
              <p className="bh-card__body">
                <code>scripts/dottie_data_expander.py --target-tokens 500000</code> →
                <code> data/shards/*.jsonl.gz</code> (32k docs/shard, 6 domains arXiv SoT bio/climate/materials/code/law/macro + frontier rubrics). Fast dedup md5
                split 13.5s vs simhash 140s O(n²). Gdrive folder Dottie-Datasets-Expansion.
              </p>
              <div className="bh-tty-frame" style={{ marginTop: 10 }}>
                <span className="bh-tty-frame__label">shard</span>
                <div className="bh-tty-frame__body" style={{ fontSize: ".72rem" }}>
                  packed_20260716_155535_00081_6671.jsonl.gz → 500034 / 5045 / 74
                </div>
              </div>
            </div>
            <div className="fleet-card">
              <div className="bh-card__title">2. J-Space brain — 4 workspaces + Router/veto</div>
              <p className="bh-card__body">
                <strong>DottieModel1B</strong> base1b 1.17B d2048 48L GQA4 SWIGLU tied 32k vocab fits 12GB.
                4 spaces: S1 Fast 32 hl=8, S2 Slow 64 hl=300, Critic 16 hl=30, Planner 32 hl=150 + Router/veto.
                YaRN RoPE 10k→1M NTK-aware QK-Norm. <code>dottie/multi_jspace_module.py</code>
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="fleet-badge">S1 Fast 32</span>
                <span className="fleet-badge">S2 Slow 64</span>
                <span className="fleet-badge">Critic 16</span>
                <span className="fleet-badge">Planner 32</span>
                <span className="fleet-badge ok">Router+veto</span>
              </div>
            </div>
            <div className="fleet-card">
              <div className="bh-card__title">3. WSD training — stop-anytime</div>
              <p className="bh-card__body">
                WSD schedule warmup 2k stable 736k (92%) decay 2e-5. Checkpoint 6GB keep last 3, smoke
                2M→nano14M→mini162M 2.5B 3-5 days 4080. Resumes from <code>dottie_stable_736k.pt</code>.
                WANDB offline.
              </p>
              <div style={{ marginTop: 10 }}>
                <div className="bh-meter">
                  <div className="bh-meter__head">
                    <span>Warmup → Stable → Decay</span>
                    <span className="bh-meter__value">2k / 736k / 2e-5</span>
                  </div>
                  <div className="bh-meter__track">
                    <div className="bh-meter__fill" style={{ width: "92%", background: "var(--bh-moss)" }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="fleet-card">
              <div className="bh-card__title">4. Eval — cap preservation 0.983 + frontier 11-cat</div>
              <p className="bh-card__body">
                Branch harness 5/5 PASS 100% cap preservation BASE 0.983 Align 0.91. Frontier rubric:
                Financial Accuracy, Transparency, Risk/Ethical, Coverage, Attribution, Numeric, Coherence,
                Citation, Instruction, Edge, Polish — weighted clipped 0-1, judge IRA 80.2%.
                Via Ollama qwen3:32b (~20GB Q4) + alternatives 32b-70b.
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="fleet-badge ok">CODE 0.983 ✓</span>
                <span className="fleet-badge ok">MATH 0.983 ✓</span>
                <span className="fleet-badge ok">CHAT 0.967 ✓</span>
              </div>
            </div>
            <div className="fleet-card">
              <div className="bh-card__title">5. LLMVM — Python runtime not JSON loop</div>
              <p className="bh-card__body">
                Dottie’s tool loop in-cell: 15 trips → 1 cell. 85% token save (6k→900), 97.5% compaction,
                87.5% blowup saved @1000 tools. BEGIN IMMEDIATE 7 hits. Replaces ReAct JSON.
              </p>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="bh-meter">
                  <div className="bh-meter__head">
                    <span>Token save</span>
                    <span className="bh-meter__value">85%</span>
                  </div>
                  <div className="bh-meter__track">
                    <div className="bh-meter__fill" style={{ width: "85%", background: "var(--bh-moss)" }}></div>
                  </div>
                </div>
                <div className="bh-meter">
                  <div className="bh-meter__head">
                    <span>Compaction</span>
                    <span className="bh-meter__value">97.5%</span>
                  </div>
                  <div className="bh-meter__track">
                    <div className="bh-meter__fill" style={{ width: "97.5%", background: "var(--bh-heather)" }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="fleet-card fleet-card--glow">
              <div className="bh-card__title">6. Always-on — 6 crons + local daemon</div>
              <p className="bh-card__body">
                Hatch: <code>dottie-data-gather-4h @4h</code>, discovery daily@14:00,
                eval daily@09:00, monitor @30m, ecosystem @1h, telemetry @1h →{" "}
                <code>dottie_live_status.json</code>. Alienware:{" "}
                <code>scripts/dottie_local_daemon.sh</code> tmux 10M/run → 60M/day → 1.8B/mo +
                Ollama.
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="fleet-badge ok">6 enabled</span>
                <span className="fleet-badge">Ava 6 disabled</span>
                <span className="fleet-badge">free-tier Vercel+GH+R2</span>
              </div>
            </div>
          </div>
        </Axis>
      </RuledSection>

      <RuledSection label="Blueprint — model_1b + multi_jspace + train + eval">
        <Axis>
          <div className="bh-grid">
            <div className="bh-card bh-card--organic">
              <div className="bh-card__title">model_1b.py — YaRN 10k→1M</div>
              <p className="bh-card__body">
                DottieModel1B YaRN NTK-aware QK-Norm, RoPE 10k→1M factors 2.0-4.0, tied embeddings 32k,
                SWIGLU, GQA4, flash-attn ready. <code>train_1b_deepspeed.py</code> WSD.
              </p>
            </div>
            <div className="bh-card">
              <div className="bh-card__title">multi_jspace_module.py</div>
              <p className="bh-card__body">
                4 workspaces routing via cosine + veto. Branching logic preserved. RealInterventionEngine
                in <code>eval_branch_harness.py</code>.
              </p>
            </div>
            <div className="bh-card">
              <div className="bh-card__title">serve_engine.py → /chat next</div>
              <p className="bh-card__body">
                FastAPI + Ollama qwen3:32b judge + Dottie base1b. Path: Vercel
                <code> /api/chat</code> → <code>cloudflared tunnel --url http://localhost:8000</code> → Alienware
                <code>:8000</code>. Mock UI at <code>/chat</code> today, live after local daemon up.
                <br />
                <a href="/chat">Open /chat (TTy soon Dottie) →</a>
              </p>
            </div>
            <div className="bh-card">
              <div className="bh-card__title">telemetry.py → live_status</div>
              <p className="bh-card__body">
                <code>reports/dottie_telemetry.jsonl</code> → <code>dottie_live_status.json</code> →{" "}
                <code>STATUS.json</code> raw → <code>/api/dottie/status</code> → this page. 53KB live,
                tail pre-wrap TTY.
              </p>
            </div>
          </div>
        </Axis>
      </RuledSection>

      <RuledSection label="Free-tier only — cost & compliance">
        <Axis>
          <div className="fleet-card">
            <div className="bh-card__title">Solo personal project — no employer connection</div>
            <p className="bh-card__body">
              Built with public/free-tier only: Vercel Hobby arxiviq.com, GitHub public repo
              <code> jcdavis131/ava-agi-factory-v6-4</code> → future <code>dottie-agi-factory</code>,
              R2/Workers, Supabase, HF ZeroGPU, ONNX WASM, Ollama local qwen3:32b. Fidelity manual
              screenshot Mon 9am CT, never Plaid. 100% solo-built, zero use of work data/code/systems/IP
              per AGENTS.md. Every artifact footer disclaimer required. Exception granted 2026-07-16 for
              arxiviq.com Dottie Control Plane (free-tier, solo disclaimer).
            </p>
            <Marginalia>
              Measured values only: 500,034 tokens / 5,045 docs / 74 shards @ 2026-07-16T15:56:01Z verified
              from STATUS.json raw. No fake evals. Dashboards match actual model (base1b 1.17B, not generic
              charts).
            </Marginalia>
          </div>
        </Axis>
      </RuledSection>

      <Axis>
        <p className="bh-marginalia" style={{ marginTop: 24 }}>
          Dottie Ecosystem v6.5 LLMVM — arxiviq.com is Dottie-only (no arXiv search, no Weaver registry
          here — those live in internal lab now). Fleet design system: Instrument Serif / DM Sans / IBM Plex
          Mono, canvas #f1e7e0, <code>fleet-shell[data-site=research]</code>, <code>TitleCard</code>,{" "}
          <code>StatusLine</code>, <code>RuledSection</code>, <code>TeamStrip</code>, <code>bh-tty-frame</code>,{" "}
          <code>bh-meter</code>, <code>fleet-badge</code>. Always-on crons 6 enabled:true (Hatch VM 500K/4h
          35s + Alienware 10M/phase). Next: rename repo → dottie-agi-factory + wire chat via tunnel.
        </p>
      </Axis>
    </>
  );
}

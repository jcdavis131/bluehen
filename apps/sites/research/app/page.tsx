import {
  Axis,
  Marginalia,
  RuledSection,
  StatusLine,
  TitleCard,
  TeamStrip,
} from "@synthaembed/ui-fleet";
import DottieControlPlane from "../components/DottieControlPlane";
import { ArxivSearchHero } from "../components/ArxivSearchHero";
import { ArxivExamDemo } from "../components/ArxivExamDemo";

export const metadata = {
  title: "Dottie Control Plane — arxiviq.com",
  description: "Dottie AGI Factory live — 500,034 tokens / 5,045 docs / 74 shards @ 2026-07-16, WSD YaRN 10k→1M base1b 1.17B, LLMVM 85% save. Solo personal project, no connection to employer.",
};
export const revalidate = 60;
export default function ResearchRagPage() {
  return (
    <>
      <StatusLine site="arxiviq.com" section="Dottie AGI Factory" status="Live Control Plane — 500K/4h + 10M/phase" />
      <Axis>
        <TitleCard
          eyebrow="Dottie AGI Factory · v6.5 LLMVM · The Weaver · arxiviq.com"
          title="Dottie is training — 500,034 tokens last expansion, WSD YaRN 10k→1M, base1b 1.17B"
          marginalia="Always-on factory · Hatch VM 500K/4h (35s) · Alienware 10M/phase → 60M/day → 1.8B/mo · Ollama qwen3:32b judge free"
        >
          <p className="bh-title-card__copy">
            The Weaver at arxiviq.com is now your live Dottie control plane — same fleet aesthetic you liked (Instrument Serif / DM Sans / IBM Mono, canvas #f1e7e0), now wired to <code>STATUS.json</code> on GitHub raw + <code>dottie_live_status.json</code> telemetry + <code>llmvm_poc_results.json</code> (85% token save / 97.5% compaction). No connection to employer — public/free-tier only, exception per AGENTS.md 2026-07-16 for arxiviq.com. <a href="/api/dottie/status">API →</a>
          </p>
        </TitleCard>
        <TeamStrip siteId="research" />
        <div className="bh-team-strip" style={{ borderLeftColor: "var(--bh-moss)" }}>
          <span className="bh-team-strip__division" style={{ color: "var(--bh-moss)" }}>Dottie — Always On</span>
          <span className="bh-team-strip__offer">Last verified: 2026-07-16T15:56:01Z • 500,034 tokens / 5,045 docs / 74 shards • manifest_20260716_155535.jsonl • gdrive Dottie-Datasets-Expansion 19tqzjB-ofqKmx1w6S4qLNB_jAEa6s3ve • 10 files uploaded / 148 dedup</span>
          <a className="bh-team-strip__byline" href="https://github.com/jcdavis131/ava-agi-factory-v6-4">source jcdavis131/ava-agi-factory-v6-4 →</a>
        </div>
      </Axis>
      <RuledSection label="Live factory — Dottie Control Plane">
        <Axis wide><DottieControlPlane /></Axis>
      </RuledSection>
      <RuledSection label="Research — arXiv retrieval (secondary, preserved)">
        <Axis>
          <div className="bh-card bh-card--organic" style={{ marginBottom: 24 }}>
            <div className="bh-card__title">Live arXiv search — still here, now secondary</div>
            <p className="bh-card__body">The original Weaver retrieval demo remains live below. Dottie's dataset expander uses same chunking + simhash dedup philosophy, now at 500K/4h cadence.</p>
          </div>
          <ArxivSearchHero />
        </Axis>
      </RuledSection>
      <RuledSection label="Engineering deep dive — org vs BGE/e5 panel (preserved)">
        <Axis><ArxivExamDemo /></Axis>
      </RuledSection>
      <RuledSection label="Use this on your own papers + Dottie chat next">
        <Axis>
          <div className="bh-grid">
            <div className="bh-card bh-card--organic">
              <div className="bh-card__title">Design-partner seats</div>
              <p className="bh-card__body">Reserved workspace: your corpus, monthly retraining behind deploy gates, direct roadmap input. First cohort, quarterly terms. Now also early access to Dottie's J-Space router patterns.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <a className="bh-btn bh-btn--primary bh-btn--hero" href="https://bhenre.com/store">Reserve a seat</a>
                <a className="bh-btn bh-btn--ghost" href="/chat">Open /chat (Dottie soon)</a>
              </div>
              <Marginalia>Each workspace trains behind same gates as Dottie deploys. Solo project disclaimer.</Marginalia>
            </div>
            <div className="bh-card">
              <div className="bh-card__title">Chat path — Vercel /api/chat → Cloudflare Tunnel → Alienware</div>
              <p className="bh-card__body">Future wiring: Vercel serverless hits cloudflared tunnel --url http://localhost:8000 → Alienware FastAPI dottie/serve_engine.py → Ollama qwen3:32b + DottieModel1B base1b (resuming dottie_stable_736k.pt). Mock UI at /chat today, live after local daemon up.</p>
              <div style={{ marginTop: 12 }}><span className="fleet-badge warn">Tunnel wiring next</span> <span className="fleet-badge ok">Fleet aesthetic preserved</span></div>
            </div>
          </div>
        </Axis>
      </RuledSection>
      <Axis><p className="bh-marginalia" style={{ marginTop: 24 }}>Solo personal project, no connection to employer, built with public/free-tier only — HOME only. Dottie AGI Factory v6.5 LLMVM 85% token save / 97.5% compaction / 87.5% blowup saved. Exception granted 2026-07-16 per AGENTS.md for arxiviq.com Dottie Control Plane (free-tier, solo disclaimer required). Fleet design system preserved: Instrument Serif / DM Sans / IBM Plex Mono.</p></Axis>
    </>
  );
}

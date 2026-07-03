import { ImageResponse } from "next/og";

/**
 * Tweetable share card for an embedding health-check result (SITE_ARCHITECTURE
 * gap: "each check result should be tweetable — pure OG-image route, no new
 * data"). Reads the already-computed diagnostics as query params and renders a
 * branded 1200×630 card. No backend, no persistence — the params come straight
 * from the /api/diagnose result the client already holds.
 *
 * Params: erank, util (0-1), model, score (0-100 dumbness), samples.
 * Usage: <img src="/api/og?erank=12.3&util=0.41&model=hen&score=42&samples=8" />
 */
export const runtime = "edge";

const C = {
  canvas: "#0b0d0a",
  surface: "#161814",
  raised: "#1c1f1a",
  border: "#2a2f28",
  text: "#e6ebe3",
  muted: "#7a8278",
  rust: "#b8734a",
  moss: "#6b8f71",
  clay: "#c4a574",
  danger: "#c45c4a",
};

function dumbnessLabel(score: number): string {
  if (score >= 90) return "Maximum cone";
  if (score >= 70) return "Pretty dumb";
  if (score >= 50) return "SOTA-ish";
  if (score >= 30) return "Trying";
  return "Suspiciously smart";
}

function num(v: string | null, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  const { searchParams: p } = new URL(req.url);
  const erank = num(p.get("erank"), 0);
  const util = num(p.get("util"), 0);
  const score = Math.max(0, Math.min(100, num(p.get("score"), 0)));
  const model = (p.get("model") ?? "your model").slice(0, 48);
  const samples = p.get("samples") ?? "—";
  const label = dumbnessLabel(score);
  const verdictColor = score >= 70 ? C.rust : score >= 50 ? C.clay : score >= 30 ? C.moss : C.text;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: C.canvas,
          color: C.text,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          fontFamily: "sans-serif",
          borderBottom: `8px solid ${verdictColor}`,
        }}
      >
        {/* Wordmark + eyebrow */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>dumbmodel</span>
            <span style={{ fontSize: 22, color: C.muted }}>.com</span>
          </div>
          <span style={{ fontSize: 20, color: C.muted }}>How dumb is your model?</span>
        </div>

        {/* Verdict headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span
              style={{
                fontSize: 96,
                fontWeight: 800,
                color: verdictColor,
                lineHeight: 1,
              }}
            >
              {label}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, fontSize: 28, color: C.text }}>
            <span>{model}</span>
            <span style={{ color: C.muted, fontSize: 22 }}>
              · {samples} samples · collapse score {score.toFixed(0)}/100
            </span>
          </div>
        </div>

        {/* Stat tiles + CTA */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "20px 28px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 18, color: C.muted }}>Effective rank</span>
            <span style={{ fontSize: 44, fontWeight: 700 }}>{erank.toFixed(1)}</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "20px 28px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 18, color: C.muted }}>Space utilization</span>
            <span style={{ fontSize: 44, fontWeight: 700 }}>{(util * 100).toFixed(0)}%</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginLeft: "auto",
              padding: "0 8px",
              fontSize: 26,
              color: verdictColor,
              fontWeight: 700,
            }}
          >
            Run yours → dumbmodel.com/check
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

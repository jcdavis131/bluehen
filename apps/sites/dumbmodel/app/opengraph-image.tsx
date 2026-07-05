import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "dumbmodel.com — Blind Rank Arcade";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = {
  canvas: "#12141a",
  text: "#f4f1ea",
  muted: "rgba(244,241,234,0.55)",
  gold: "#f5c842",
  hot: "#ff6b4a",
};

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(165deg, ${C.canvas} 0%, #1a1d26 100%)`,
          color: C.text,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          fontFamily: "sans-serif",
          borderBottom: `8px solid ${C.hot}`,
        }}
      >
        <div style={{ fontSize: 28, color: C.muted, letterSpacing: 4, textTransform: "uppercase" }}>
          dumbmodel.com
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, marginTop: 16, lineHeight: 1.05, maxWidth: 980 }}>
          Rank it blind.
          <span style={{ color: C.gold }}> See the tier list.</span>
        </div>
        <div style={{ fontSize: 28, color: C.muted, marginTop: 24, maxWidth: 820 }}>
          Eight rapid picks · S-tier reveal · real rank engine underneath
        </div>
        <div style={{ display: "flex", marginTop: 40, gap: 14 }}>
          {["Blind Rank", "Beat It", "Impact", "Lab"].map((label) => (
            <span
              key={label}
              style={{
                fontSize: 22,
                padding: "10px 18px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 999,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}

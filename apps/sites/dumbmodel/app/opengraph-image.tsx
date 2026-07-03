import { ImageResponse } from "next/og";

/**
 * Default Open Graph image for dumbmodel.com (Next.js file convention —
 * applies to every page under /app unless overridden). A static branded card
 * so any dumbmodel URL is tweetable out of the box; per-result cards use the
 * dynamic /api/og route.
 */
export const runtime = "edge";
export const alt = "dumbmodel — How dumb is your embedding?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const C = {
  canvas: "#0b0d0a",
  surface: "#161814",
  border: "#2a2f28",
  text: "#e6ebe3",
  muted: "#7a8278",
  rust: "#b8734a",
};

export default function OgImage() {
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
          justifyContent: "center",
          padding: "72px",
          fontFamily: "sans-serif",
          borderBottom: `8px solid ${C.rust}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>dumbmodel</span>
          <span style={{ fontSize: 28, color: C.muted }}>.com</span>
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, marginTop: 24, lineHeight: 1.1, maxWidth: 900 }}>
          How dumb is your model?
        </div>
        <div style={{ fontSize: 30, color: C.muted, marginTop: 20, maxWidth: 820 }}>
          Free measured diagnostics — effective rank, space utilization, redundancy.
          Benchmarks measured on eval gates, not marketing claims.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            gap: 16,
          }}
        >
          {["/check", "/compare", "/hall", "/museum"].map((r) => (
            <span
              key={r}
              style={{
                fontSize: 22,
                color: C.text,
                padding: "10px 18px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
              }}
            >
              {r}
            </span>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}

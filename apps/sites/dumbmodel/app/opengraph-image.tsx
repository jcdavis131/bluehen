import { ImageResponse } from "next/og";

/**
 * Default Open Graph image for dumbmodel.com (Next.js file convention —
 * applies to every page under /app unless overridden). A static branded card
 * so any dumbmodel URL is tweetable out of the box; per-result cards use the
 * dynamic /api/og route.
 */
export const runtime = "edge";
export const alt = "dumbmodel: How dumb is your embedding?";
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

// Refined cone mark as an SVG data URI (Satori renders <img>, not inline SVG).
// Knockout bands/eye use the card canvas so they read as cut stripes.
const CONE_MARK_SRC =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Cpath%20d='M32%209%20L49%2049%20L15%2049%20Z'%20fill='%23b8734a'/%3E%3Cpath%20d='M23.5%2033%20L32%2030%20L40.5%2033%20L42%2037%20L32%2033.5%20L22%2037%20Z'%20fill='%230b0d0a'/%3E%3Cpath%20d='M19%2043%20L32%2039.5%20L45%2043%20L46.5%2047%20L32%2043%20L17.5%2047%20Z'%20fill='%230b0d0a'/%3E%3Crect%20x='10'%20y='49'%20width='44'%20height='6'%20rx='2.5'%20fill='%23b8734a'/%3E%3C/svg%3E";

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
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={CONE_MARK_SRC} width={64} height={64} alt="" />
          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>dumbmodel</span>
            <span style={{ fontSize: 28, color: C.muted }}>.com</span>
          </div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, marginTop: 24, lineHeight: 1.1, maxWidth: 900 }}>
          How dumb is your model?
        </div>
        <div style={{ fontSize: 30, color: C.muted, marginTop: 20, maxWidth: 820 }}>
          Free measured diagnostics: effective rank, space utilization, redundancy.
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

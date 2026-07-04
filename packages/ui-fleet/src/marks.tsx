/**
 * Fleet logo system — crest register.
 *
 * - SiteEmblem: the monoline pictogram for a surface, in currentColor.
 *   Replaces the solid-silhouette marks in header lockups; reads at 16px.
 * - Roundel: the full crest — concentric rings, site name arcing over the
 *   top, organization name arcing under the bottom, emblem centered.
 *   Single color (currentColor), so it sits on any canvas in any theme.
 *
 * Geometry lives in mark-geometry.ts (shared with the favicon generator).
 */

import { useId } from "react";
import { DEFAULT_EMBLEM, EMBLEM_STROKE, SITE_EMBLEMS, type EmblemShape } from "./mark-geometry";

function renderShapes(shapes: EmblemShape[]) {
  return shapes.map((s, i) => {
    if (s.t === "p") return <path key={i} d={s.d} fill="none" />;
    if (s.t === "pf") return <path key={i} d={s.d} fill="currentColor" stroke="none" />;
    if (s.t === "pe") return <path key={i} d={s.d} fill="currentColor" fillRule="evenodd" stroke="none" />;
    if (s.t === "c") return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="none" />;
    return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="currentColor" stroke="none" />;
  });
}

function emblemFor(siteId?: string): EmblemShape[] {
  return (siteId && SITE_EMBLEMS[siteId]) || DEFAULT_EMBLEM;
}

/** Monoline pictogram, currentColor. The header-lockup mark. */
export function SiteEmblem({ siteId, size = 24 }: { siteId?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      className="bh-mark"
      stroke="currentColor"
      strokeWidth={EMBLEM_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {renderShapes(emblemFor(siteId))}
    </svg>
  );
}

/**
 * The crest. `title` arcs over the top, `subtitle` under the bottom,
 * separated by two dots at the horizontal axis — one ring outside, one
 * inside, emblem centered. Both text bands share a baseline radius so the
 * band reads as one engraved circle.
 */
export function Roundel({
  siteId,
  title,
  subtitle = "BLUE HEN RE",
  size = 120,
}: {
  siteId?: string;
  title: string;
  subtitle?: string;
  size?: number;
}) {
  const uid = useId();
  const topId = `${uid}-top`;
  const bottomId = `${uid}-bottom`;
  const R = 24.3; // shared text baseline radius (64-grid)
  // Fit the band: the semicircle holds ~14 characters at full size;
  // longer names engrave smaller rather than colliding with the dots.
  const fit = (s: string) => (s.length > 14 ? { fontSize: "4.5px", letterSpacing: "0.6px" } : { fontSize: "5.4px", letterSpacing: "0.9px" });
  const topFit = fit(title);
  const bottomFit = fit(subtitle);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${title} — ${subtitle}`}
      className="bh-roundel"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        {/* top band: left→right over the crown, glyphs upright */}
        <path id={topId} d={`M ${32 - R} 32 A ${R} ${R} 0 0 1 ${32 + R} 32`} />
        {/* bottom band: left→right under the base (sweep 0) — seal
            convention, glyph tops toward the center */}
        <path id={bottomId} d={`M ${32 - R - 1} 32 A ${R + 1} ${R + 1} 0 0 0 ${32 + R + 1} 32`} />
      </defs>

      {/* rings */}
      <circle cx="32" cy="32" r="30.2" fill="none" strokeWidth="2.4" />
      <circle cx="32" cy="32" r="19" fill="none" strokeWidth="1.6" />

      {/* band separators at 3 and 9 o'clock */}
      <circle cx={32 - R} cy="32" r="1.15" fill="currentColor" stroke="none" />
      <circle cx={32 + R} cy="32" r="1.15" fill="currentColor" stroke="none" />

      {/* band lettering */}
      <text
        fill="currentColor"
        stroke="none"
        style={{
          fontFamily: "var(--bh-font-body, system-ui, sans-serif)",
          fontWeight: 700,
          ...topFit,
        }}
      >
        <textPath href={`#${topId}`} startOffset="50%" textAnchor="middle">
          {title.toUpperCase()}
        </textPath>
      </text>
      <text
        fill="currentColor"
        stroke="none"
        style={{
          fontFamily: "var(--bh-font-body, system-ui, sans-serif)",
          fontWeight: 700,
          ...bottomFit,
        }}
      >
        <textPath href={`#${bottomId}`} startOffset="50%" textAnchor="middle">
          {subtitle.toUpperCase()}
        </textPath>
      </text>

      {/* emblem, scaled into the inner field */}
      <g transform="translate(14.4 14.4) scale(0.55)" strokeWidth={EMBLEM_STROKE / 0.55}>
        {renderShapes(emblemFor(siteId))}
      </g>
    </svg>
  );
}

/** Fleet marks (shared home: moved up from dumbmodel so sites reuse
 * rather than fork). Two registers:
 *   - Mascots (HenMascot / ConeMascot): the brand characters, in their
 *     signature hues, with an optional pointer-tracking gaze. One per page.
 *   - Logo marks (HenMark / ConeMark): currentColor corporate glyphs for
 *     the header lockup and favicons. No gaze, no character; just the sign.
 *
 * Geometry is geometric/heraldic, not cartoon: a solid Blue Hen head in
 * profile and a hazard-banded traffic cone. They read at 16px (favicon)
 * and at 120px (title card) without losing the form. */

const HEN_BLUE = "var(--bh-hen-blue)";
const CONE_RUST = "var(--bh-cone-rust)";

/** Shared hen geometry, drawn in a 0..64 grid, profile facing right.
 * `color` fills the silhouette; `knockout` punches the eye (use the page
 * canvas so the eye reads on any backdrop the mark sits on). */
function HenGlyph({
  color,
  knockout,
  gazeDx = 0,
}: {
  color: string;
  knockout: string;
  gazeDx?: number;
}) {
  return (
    <g>
      {/* neck/base */}
      <path d="M22 47 L36 47 L39 58 L19 58 Z" fill={color} />
      {/* head body */}
      <path
        d="M18 33
           C18 24 24 19 31 19
           C39 19 47 25 47 33
           C47 40 41 45 33 45
           C24 45 18 41 18 33 Z"
        fill={color}
      />
      {/* comb: three bumps, the classic hen abstraction */}
      <path
        d="M25 20 L26 14 L29 18 L31 12 L33 17 L35 13 L37 19 Z"
        fill={color}
      />
      {/* beak, pointed right */}
      <path d="M46 30 L55 32 L46 35 Z" fill={color} />
      {/* eye, punched out and gaze-shifted via transform (not the cx
          attribute, which transitions inconsistently across browsers) */}
      <g style={{ transform: `translateX(${gazeDx}px)`, transition: "transform 320ms var(--bh-ease-out)" }}>
        <circle cx="33" cy="31" r="2.6" fill={knockout} />
      </g>
    </g>
  );
}

/** Shared cone geometry: a clean traffic cone with two hazard chevrons and
 * a base plate. No face, industrial. `color` is the cone; bands are knockout
 * so they read as cut stripes on any backdrop. */
function ConeGlyph({ color, knockout }: { color: string; knockout: string }) {
  return (
    <g>
      <path d="M32 9 L49 49 L15 49 Z" fill={color} />
      {/* hazard chevron bands, cut out of the cone body */}
      <path d="M23.5 33 L32 30 L40.5 33 L42 37 L32 33.5 L22 37 Z" fill={knockout} />
      <path d="M19 43 L32 39.5 L45 43 L46.5 47 L32 43 L17.5 47 Z" fill={knockout} />
      {/* base plate */}
      <rect x="10" y="49" width="44" height="6" rx="2.5" fill={color} />
    </g>
  );
}

/** The Blue Hen, the company mascot. Signature hen-blue so she is the same
 * bird on every surface (the dumbmodel "vs" reads blue hen against rust cone). */
export function HenMascot({
  size = 48,
  gaze = 0,
  color = HEN_BLUE,
  knockout = "var(--bh-canvas)",
}: {
  size?: number;
  /** Horizontal gaze, -1 (left) to 1 (right), toward the active division. */
  gaze?: number;
  /** Silhouette fill. Defaults to the brand hen-blue. */
  color?: string;
  /** Eye knockout fill. Defaults to the page canvas. */
  knockout?: string;
}) {
  const dx = Math.max(-1, Math.min(1, gaze)) * 2;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <HenGlyph color={color} knockout={knockout} gazeDx={dx} />
    </svg>
  );
}

/** The traffic cone, dumbmodel's anti-hype diagnostic mascot. */
export function ConeMascot({
  size = 48,
  color = CONE_RUST,
  knockout = "var(--bh-canvas)",
}: {
  size?: number;
  color?: string;
  knockout?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <ConeGlyph color={color} knockout={knockout} />
    </svg>
  );
}

/** Corporate logo marks: currentColor so they inherit the site accent in the
 *  header lockup and hardcode cleanly in static favicon SVGs. No gaze, no
 *  character, just the sign. */
export function HenMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="bh-mark">
      <HenGlyph color="currentColor" knockout="var(--bh-canvas)" />
    </svg>
  );
}

export function ConeMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="bh-mark">
      <ConeGlyph color="currentColor" knockout="var(--bh-canvas)" />
    </svg>
  );
}

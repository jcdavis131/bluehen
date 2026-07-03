import { BRAND } from "@synthaembed/fleet";

/** UX-123 (Spec 0020): lightweight org context for interior pages — a
 * deep-linked visitor still sees whose company this surface is without
 * repeating the homepage's full TeamStrip. Reuses the strip's byline
 * styling so the mark reads the same everywhere. */
export function OrgByline() {
  return (
    <p className="bh-meta" style={{ margin: "var(--bh-space-3) 0 0" }}>
      <a className="bh-team-strip__byline" href="https://bhenre.com">
        a {BRAND.name} company →
      </a>
    </p>
  );
}

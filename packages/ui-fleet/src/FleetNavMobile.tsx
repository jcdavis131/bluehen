"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

export function FleetNavMobile({
  nav,
  controlHref,
}: {
  nav: { id: string; href: string; label: string }[];
  controlHref: string | null;
}) {
  const [navOpen, setNavOpen] = useState(false);

  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  return (
    <>
      <button
        className="fleet-nav-toggle"
        onClick={toggleNav}
        aria-label={navOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={navOpen}
      >
        {navOpen ? "✕" : "☰"}
      </button>
      <nav className={`fleet-nav${navOpen ? " is-open" : ""}`} aria-label="Product surfaces">
        {controlHref && (
          <Link href={controlHref} onClick={closeNav}>
            Operations Center
          </Link>
        )}
        {nav.map((s) => (
          <a key={s.id} href={s.href} onClick={closeNav}>
            {s.label}
          </a>
        ))}
      </nav>
    </>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { getSite, getSiteCircuit, RE, BRAND } from "@synthaembed/fleet";
import { fleetNavSites, siteHref } from "./urls";

export function FleetShell({
  siteId,
  children,
}: {
  siteId: string;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const site = getSite(siteId);
  const surface = getSiteCircuit(siteId);
  const nav = fleetNavSites(siteId);
  const local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1";
  const hq = getSite("hq");

  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  return (
    <div className="fleet-shell" data-site={siteId}>
      <header className="fleet-header">
        <Link href="/" className="fleet-brand" onClick={closeNav}>
          <span className="fleet-brand__mark">B</span>
          <span>{surface?.stop ?? site?.name ?? siteId}</span>
          {site?.domain && <span className="fleet-brand__domain">{site.domain}</span>}
        </Link>
        <button
          className="fleet-nav-toggle"
          onClick={toggleNav}
          aria-label={navOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={navOpen}
        >
          {navOpen ? "✕" : "☰"}
        </button>
        <nav className={`fleet-nav${navOpen ? " is-open" : ""}`} aria-label="Product surfaces">
          {hq && (
            <Link href={siteHref(hq, local)} onClick={closeNav}>
              Headquarters
            </Link>
          )}
          {nav.map((s) => {
            const stop = getSiteCircuit(s.id);
            return (
              <a key={s.id} href={siteHref(s, local)} onClick={closeNav}>
                {stop?.stop ?? s.domain ?? s.id}
              </a>
            );
          })}
        </nav>
      </header>
      <main className="fleet-main">{children}</main>
      <footer className="fleet-footer">
        <span>{BRAND.name} · {RE.dual}</span>
        <a href="https://bhenre.com">Storefront</a>
        <a href="https://jcamd.com">Headquarters</a>
      </footer>
    </div>
  );
}

export { siteHref, fleetNavSites } from "./urls";

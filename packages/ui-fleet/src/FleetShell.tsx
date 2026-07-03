"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSite, getSiteCircuit, getSiteNav, listSites, RE, BRAND } from "@synthaembed/fleet";
import { fleetNavSites, siteHref } from "./urls";

/** Fleet surfaces grouped by their job in the operating loop — the nav
 * tells the org story instead of listing links. */
const SURFACE_GROUPS: { label: string; ids: string[] }[] = [
  { label: "Prove & certify", ids: ["dumbmodel", "validation"] },
  { label: "Products", ids: ["storefront", "research", "simulation"] },
  { label: "Operations", ids: ["hq", "observatory"] },
];

export function FleetShell({
  siteId,
  children,
}: {
  siteId: string;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [fleetOpen, setFleetOpen] = useState(false);
  const fleetRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? "/";
  const site = getSite(siteId);
  const surface = getSiteCircuit(siteId);
  const siteNav = getSiteNav(siteId);
  const local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1";

  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);
  const closeAll = useCallback(() => {
    setNavOpen(false);
    setFleetOpen(false);
  }, []);

  // Close the fleet panel on outside click / Escape.
  useEffect(() => {
    if (!fleetOpen) return;
    function onDown(e: MouseEvent) {
      if (fleetRef.current && !fleetRef.current.contains(e.target as Node)) setFleetOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFleetOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [fleetOpen]);

  const allSites = listSites({ status: "active" }).filter(
    (s) => s.role !== "fleet-agent" && (s.domain || s.port),
  );

  return (
    <div className="fleet-shell" data-site={siteId}>
      <header className="fleet-header">
        <Link href="/" className="fleet-brand" onClick={closeAll}>
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
        <nav className={`fleet-nav${navOpen ? " is-open" : ""}`} aria-label="Site">
          {siteNav.map((item) => {
            const active =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeAll}
                className={active ? "active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="fleet-switcher" ref={fleetRef}>
            <button
              className="fleet-switcher__button"
              onClick={() => setFleetOpen((v) => !v)}
              aria-expanded={fleetOpen}
              aria-haspopup="true"
            >
              {BRAND.name} <span aria-hidden="true">{fleetOpen ? "▴" : "▾"}</span>
            </button>
            {fleetOpen && (
              <div className="fleet-switcher__panel" role="menu" aria-label="Organization surfaces">
                <p className="fleet-switcher__lede">
                  One organization — {BRAND.name}. Every surface feeds the same
                  operating loop: {BRAND.tagline.toLowerCase()}
                </p>
                {SURFACE_GROUPS.map((group) => {
                  const members = group.ids
                    .map((id) => allSites.find((s) => s.id === id))
                    .filter((s): s is NonNullable<typeof s> => Boolean(s));
                  if (members.length === 0) return null;
                  return (
                    <div key={group.label} className="fleet-switcher__group">
                      <span className="fleet-switcher__group-label">{group.label}</span>
                      {members.map((s) => {
                        const stop = getSiteCircuit(s.id);
                        const isHere = s.id === siteId;
                        return (
                          <a
                            key={s.id}
                            href={isHere ? "/" : siteHref(s, local)}
                            className={`fleet-switcher__item${isHere ? " is-current" : ""}`}
                            onClick={closeAll}
                            aria-current={isHere ? "page" : undefined}
                          >
                            <span className="fleet-switcher__item-name">
                              {stop?.stop ?? s.name ?? s.id}
                              {isHere && <span className="fleet-switcher__here"> · you are here</span>}
                            </span>
                            {stop?.role && (
                              <span className="fleet-switcher__item-role">{stop.role}</span>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </header>
      <main className="fleet-main">{children}</main>
      <footer className="fleet-footer fleet-footer--org">
        <div className="fleet-footer__grid">
          <div>
            <span className="fleet-footer__title">{BRAND.name}</span>
            <p className="fleet-footer__note">
              {RE.dual}. One organization operating a governed embedding
              lifecycle — every deploy passes published evaluation gates.
            </p>
          </div>
          {SURFACE_GROUPS.map((group) => {
            const members = group.ids
              .map((id) => allSites.find((s) => s.id === id))
              .filter((s): s is NonNullable<typeof s> => Boolean(s));
            if (members.length === 0) return null;
            return (
              <div key={group.label}>
                <span className="fleet-footer__title">{group.label}</span>
                <ul className="fleet-footer__list">
                  {members.map((s) => {
                    const stop = getSiteCircuit(s.id);
                    return (
                      <li key={s.id}>
                        <a href={s.id === siteId ? "/" : siteHref(s, local)}>
                          {stop?.stop ?? s.name ?? s.id}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="fleet-footer__legal">
          <span>© {new Date().getFullYear()} {BRAND.name}</span>
          <a href="https://bhenre.com/legal/privacy">Privacy</a>
          <a href="https://bhenre.com/legal/terms">Terms</a>
          <a href="https://bhenre.com/contact">Contact</a>
        </div>
      </footer>
    </div>
  );
}

export { siteHref, fleetNavSites } from "./urls";

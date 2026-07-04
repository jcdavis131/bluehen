"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSite, getSiteCircuit, getSiteNav, listSites, RE, BRAND } from "@synthaembed/fleet";
import { fleetNavSites, siteHref } from "./urls";
import { Roundel, SiteEmblem } from "./marks";

/** Runs during HTML parse, before first paint: stamps the stored theme on
 * <html> so tokens.css resolves the right palette immediately. With no
 * stored choice, the prefers-color-scheme media block in tokens.css rules. */
const THEME_INIT = `(function(){try{var t=localStorage.getItem("bh-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-bh-theme",t);}catch(e){}})();`;

function currentTheme(): "light" | "dark" {
  const stamped = document.documentElement.getAttribute("data-bh-theme");
  if (stamped === "dark" || stamped === "light") return stamped;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function ThemeToggle() {
  // null until mounted — the server can't know the theme, so render a
  // neutral glyph first and settle after hydration.
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  const toggle = useCallback(() => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-bh-theme", next);
    try {
      localStorage.setItem("bh-theme", next);
    } catch {
      /* private mode — theme still applies for this page */
    }
    setTheme(next);
  }, []);

  return (
    <button
      type="button"
      className="fleet-theme-toggle"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? (
        /* sun */
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7" />
        </svg>
      ) : (
        /* moon */
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.6 14.2A8.8 8.8 0 0 1 9.8 3.4 8.8 8.8 0 1 0 20.6 14.2Z" />
        </svg>
      )}
    </button>
  );
}

/** Corporate topology (Spec 0019): ONE company site, revenue-bearing
 * business units, internal consoles — derived from fleet.json orgRole so
 * the nav is always the org chart, never a hardcoded list. */
const ROLE_GROUPS: { label: string; role: string }[] = [
  { label: "The company", role: "company" },
  { label: "Business units", role: "business-unit" },
  { label: "Internal operations", role: "internal" },
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
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      <header className="fleet-header">
        <Link href="/" className="fleet-brand" onClick={closeAll} aria-label={`${surface?.stop ?? site?.name ?? siteId} home`}>
          <span className="fleet-brand__mark" aria-hidden="true">
            <SiteEmblem siteId={siteId} size={22} />
          </span>
          <span>{surface?.stop ?? site?.name ?? siteId}</span>
          {site?.domain && <span className="fleet-brand__domain">{site.domain}</span>}
        </Link>
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
                  One organization: {BRAND.name}. Every surface feeds the same
                  operating loop: {BRAND.tagline.toLowerCase()}
                </p>
                {ROLE_GROUPS.map((group) => {
                  const members = allSites.filter((s) => (s.orgRole ?? "business-unit") === group.role);
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
        <div className="fleet-header__actions">
          <ThemeToggle />
          <button
            className="fleet-nav-toggle"
            onClick={toggleNav}
            aria-label={navOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={navOpen}
          >
            {navOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>
      <main className="fleet-main">{children}</main>
      <footer className="fleet-footer fleet-footer--org">
        <div className="fleet-footer__grid">
          <div>
            <span className="fleet-footer__roundel">
              <Roundel siteId={siteId} title={surface?.stop ?? site?.name ?? siteId} size={104} />
            </span>
            <span className="fleet-footer__title">{BRAND.name}</span>
            <p className="fleet-footer__note">
              {RE.dual}. One organization operating a governed embedding
              lifecycle; every deploy passes published evaluation gates.
            </p>
          </div>
          {ROLE_GROUPS.map((group) => {
            const members = allSites.filter((s) => (s.orgRole ?? "business-unit") === group.role);
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

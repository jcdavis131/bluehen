import Link from "next/link";

export type SiteNavItem = { href: string; label: string };

export function SiteSubnav({ items, currentPath }: { items: SiteNavItem[]; currentPath: string }) {
  return (
    <nav className="bh-subnav" aria-label="Site sections">
      {items.map((item) => {
        const active =
          currentPath === item.href || (item.href !== "/" && currentPath.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bh-subnav__link${active ? " is-active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ApiStatusBanner({
  online,
  apiKeyConfigured,
  modelVersion,
  indexedHint,
}: {
  online: boolean;
  apiKeyConfigured: boolean;
  modelVersion?: string | null;
  indexedHint?: string;
}) {
  const ready = online && apiKeyConfigured;
  return (
    <div className={`bh-badge ${ready ? "bh-badge--ok" : "bh-badge--warn"}`} style={{ marginBottom: 16 }}>
      <span>{ready ? "API connected" : "Offline / not configured"}</span>
      {modelVersion && <> · {modelVersion}</>}
      {indexedHint && <> · {indexedHint}</>}
      {!apiKeyConfigured && <> · set SYNTH_API_KEY</>}
    </div>
  );
}

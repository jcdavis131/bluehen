import { listSites, type FleetSite } from "@synthaembed/fleet";

/** Local dev: set NEXT_PUBLIC_FLEET_LOCAL=1 to link localhost ports. */
export function siteHref(site: FleetSite, local = process.env.NEXT_PUBLIC_FLEET_LOCAL === "1"): string {
  if (local && site.port) return `http://localhost:${site.port}`;
  if (site.domain) return `https://${site.domain}`;
  return "#";
}

export function fleetNavSites(currentId: string) {
  return listSites({ status: "active" }).filter(
    (s) => s.role !== "fleet-agent" && s.id !== currentId && (s.domain || s.port),
  );
}

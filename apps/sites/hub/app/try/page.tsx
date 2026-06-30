import { LiveSearchPanel, PageHeader, SiteSubnav } from "@synthaembed/ui-fleet";
import { getSiteCircuit, getSiteNav, GLOSSARY } from "@synthaembed/fleet";

export const metadata = {
  title: `${GLOSSARY.liveSearch} — Platform Console`,
};

export default function HubTryPage() {
  const surface = getSiteCircuit("hub");
  const nav = getSiteNav("hub");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title={GLOSSARY.liveSearch}
        lead="Tenant workspace retrieval — same production path used across all product surfaces."
      />
      <SiteSubnav items={nav} currentPath="/try" />
      <LiveSearchPanel siteId="hub" />
    </>
  );
}

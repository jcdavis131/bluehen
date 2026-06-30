import { FeedbackForm, PageHeader, SiteSubnav } from "@synthaembed/ui-fleet";
import { getSiteCircuit, getSiteNav, GLOSSARY } from "@synthaembed/fleet";

export const metadata = {
  title: `${GLOSSARY.feedback} — Platform Console`,
};

export default function HubFeedbackPage() {
  const surface = getSiteCircuit("hub");
  const nav = getSiteNav("hub");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title={GLOSSARY.feedback}
        lead={`Operational signals route to Platform Orchestration — recorded in the ${GLOSSARY.raceLog}.`}
      />
      <SiteSubnav items={nav} currentPath="/feedback" />
      <FeedbackForm siteId="hub" division="orchestration" />
    </>
  );
}

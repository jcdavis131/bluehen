import { FeedbackForm, PageHeader, SiteSubnav } from "@synthaembed/ui-fleet";
import { getSiteNav, GLOSSARY } from "@synthaembed/fleet";

export const metadata = {
  title: `${GLOSSARY.feedback} — Validation Lab`,
};

export default function FeedbackPage() {
  const nav = getSiteNav("benchmark-lab");

  return (
    <>
      <PageHeader
        eyebrow="Validation Lab · slasso.com"
        title={GLOSSARY.feedback}
        lead={`Pilot feedback is recorded in the ${GLOSSARY.raceLog} for Validation → R&D review.`}
      />
      <SiteSubnav items={nav} currentPath="/feedback" />
      <FeedbackForm siteId="benchmark-lab" division="bd" />
    </>
  );
}

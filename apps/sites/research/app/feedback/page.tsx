import { FeedbackForm, PageHeader, SiteSubnav } from "@synthaembed/ui-fleet";
import { getSiteNav, GLOSSARY } from "@synthaembed/fleet";

export const metadata = {
  title: `${GLOSSARY.feedback} — Applied Research`,
  description: `Submit ${GLOSSARY.feedback.toLowerCase()} to the Operations Ledger`,
};

export default function FeedbackPage() {
  const nav = getSiteNav("research");

  return (
    <>
      <PageHeader
        eyebrow="Applied Research · arxiviq.com"
        title={GLOSSARY.feedback}
        lead={`Signals are recorded in the ${GLOSSARY.raceLog} for cross-division lifecycle planning.`}
      />
      <SiteSubnav items={nav} currentPath="/feedback" />
      <FeedbackForm siteId="research" division="research" />
    </>
  );
}

import { FeedbackForm, PageHeader } from "@synthaembed/ui-fleet";import { getSiteCircuit, GLOSSARY } from "@synthaembed/fleet";
export const metadata = {
  title: `${GLOSSARY.feedback} — Platform Console`,
};

export default function HubFeedbackPage() {
  const surface = getSiteCircuit("storefront");

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title={GLOSSARY.feedback}
        lead={`Operational signals route to Platform Orchestration — recorded in the ${GLOSSARY.raceLog}.`}
      />
      <FeedbackForm siteId="storefront" division="orchestration" />
    </>
  );
}

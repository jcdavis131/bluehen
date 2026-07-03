import { FeedbackForm, PageHeader } from "@synthaembed/ui-fleet";import { GLOSSARY } from "@synthaembed/fleet";
export const metadata = {
  title: `${GLOSSARY.feedback} — Validation Lab`,
};

export default function FeedbackPage() {

  return (
    <>
      <PageHeader
        eyebrow="Validation Lab · slasso.com"
        title={GLOSSARY.feedback}
        lead={`Pilot feedback is recorded in the ${GLOSSARY.raceLog} for Validation → R&D review.`}
      />
      <FeedbackForm siteId="validation" division="bd" />
    </>
  );
}

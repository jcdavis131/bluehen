import { FeedbackForm, PageHeader } from "@synthaembed/ui-fleet";import { GLOSSARY } from "@synthaembed/fleet";
export const metadata = {
  title: `${GLOSSARY.feedback} — Applied Research`,
  description: `Submit ${GLOSSARY.feedback.toLowerCase()} to the Operations Ledger`,
};

export default function FeedbackPage() {

  return (
    <>
      <PageHeader
        eyebrow="Applied Research · arxiviq.com"
        title={GLOSSARY.feedback}
        lead={`Signals are recorded in the ${GLOSSARY.raceLog} for cross-division lifecycle planning.`}
      />
      <FeedbackForm siteId="research" division="research" />
    </>
  );
}

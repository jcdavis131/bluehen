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
        title="Tell us what missed"
        lead="If a search result was wrong or unhelpful, leave a note here. We read every submission when prioritizing the next corpus refresh and model run."
      />
      <FeedbackForm siteId="research" division="research" />
    </>
  );
}

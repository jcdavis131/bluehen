import { FeedbackForm, PageHeader } from "@synthaembed/ui-fleet";import { GLOSSARY } from "@synthaembed/fleet";
export const metadata = {
  title: `${GLOSSARY.feedback} — Operations Center`,
};

export default function ControlFeedbackPage() {

  return (
    <>
      <PageHeader
        eyebrow="Operations Center · jcamd.com"
        title={GLOSSARY.feedback}
        lead="Operator feedback routes to Platform Orchestration for prioritization and data requests."
      />
      <FeedbackForm siteId="hq" division="orchestration" />
    </>
  );
}

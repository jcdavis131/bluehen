import { FeedbackForm, PageHeader } from "@synthaembed/ui-fleet";import { GLOSSARY } from "@synthaembed/fleet";
export const metadata = {
  title: GLOSSARY.feedback,
};

export default function ControlFeedbackPage() {

  return (
    <>
      <PageHeader
        eyebrow="Headquarters · jcamd.com"
        title={GLOSSARY.feedback}
        lead="Operator feedback routes to Platform Orchestration for prioritization and data requests."
      />
      <FeedbackForm siteId="hq" division="orchestration" />
    </>
  );
}

import { Axis, PageHeader, StatusLine } from "@synthaembed/ui-fleet";

export const metadata = {
  title: "Privacy",
  description: "How dumbmodel.com handles anonymous arena picks and diagnostic data.",
};

export default function PrivacyPage() {
  return (
    <>
      <StatusLine site="dumbmodel.com" section="Legal" status="Privacy" />

      <Axis>
        <PageHeader
          eyebrow="Legal"
          title="Privacy"
          lead="What we store on dumbmodel.com and why."
        />

        <div className="bh-stack" style={{ gap: 16, maxWidth: 640 }}>
          <p>
            <strong>Shapley Arena.</strong> When you play the taste game at /arena, we store
            anonymous pick events tied to a random session identifier in your browser
            (sessionStorage). No account is created. Picks help improve ranking quality across
            sessions. We do not ask for opt-in on each pick — the banner on the arena explains
            this before you play.
          </p>
          <p>
            <strong>Health check and lab tools.</strong> Diagnostic submissions may use a separate
            opt-in consent flow on /check when you choose to share samples for research.
          </p>
          <p className="bh-muted">
            Enterprise privacy policy:{" "}
            <a href="https://bhenre.com/legal/privacy">bhenre.com/legal/privacy</a>
          </p>
        </div>
      </Axis>
    </>
  );
}

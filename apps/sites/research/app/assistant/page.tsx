import { Axis, RuledSection, StatusLine, TitleCard } from "@synthaembed/ui-fleet";
import AssistantConsole from "../../components/AssistantConsole";

export const metadata = {
  title: "Dottie Assistant — arxiviq.com",
  description:
    "Dottie, a grounded, trust-gated, telemetered tool-use assistant. Every tool call passes a declared capability boundary before it runs; every step is written to a local telemetry ledger you own. Hermes/OpenClaw-style, hosted on arxiviq.com. Solo personal project.",
};

export const revalidate = 60;

export default function AssistantPage() {
  return (
    <>
      <StatusLine
        site="arxiviq.com"
        section="Dottie Assistant"
        status="Grounded · trust-gated · telemetered — tool-use over the Dottie model"
      />

      <Axis>
        <TitleCard
          eyebrow="Dottie · tool-use assistant · Hermes/OpenClaw-style · spec 15"
          title="Dottie — an assistant that shows its work"
          marginalia="Trained by the tool-use curriculum (grounded single → multi-step chain → error recovery → tool selection → refusal). Every Action is checked against a capability table before dispatch; sandboxed file tools reject path traversal; every step is a local telemetry line. Telemetry is a Trust boundary, not a product feature — nothing is phoned home."
        >
          <p className="bh-title-card__copy">
            This is the assistant half of the Dottie ecosystem: the same model you can
            watch train on the home page, wired into a ReAct tool loop that prefers to
            <strong> check a tool over guessing</strong>, answers from the tool&apos;s
            Observation rather than memory, and <strong>declines destructive tools</strong>
            {" "}instead of running them. The panels below read the published
            <code> assistant_status.json</code> — the live capability boundary, tool
            catalog, and telemetry rollup — and the chat box replays an authentic
            grounded/refused transcript (or talks to the live backend when a tunnel is
            configured). Solo personal project, no connection to employer, free-tier only.
          </p>
        </TitleCard>
      </Axis>

      <Axis>
        <RuledSection label="Console">
          <AssistantConsole />
        </RuledSection>
      </Axis>
    </>
  );
}

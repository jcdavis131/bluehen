import { PageHeader } from "@synthaembed/ui-fleet";import { getSiteCircuit, GLOSSARY } from "@synthaembed/fleet";import Link from "next/link";
import { GuidedTry } from "../../components/GuidedTry";

export const metadata = {
  title: `${GLOSSARY.liveSearch} — Platform Console`,
};

const API = process.env.SYNTH_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const KEY = process.env.SYNTH_API_KEY ?? "";

async function deployedModel() {
  try {
    const res = await fetch(`${API}/v1/models`, {
      headers: { authorization: `Bearer ${KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.models ?? []).find((m: { deployed?: boolean }) => m.deployed) ?? null;
  } catch {
    return null;
  }
}

export default async function HubTryPage() {
  const surface = getSiteCircuit("storefront");
  const deployed = await deployedModel();

  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title={GLOSSARY.liveSearch}
        lead="Tenant workspace retrieval — same production path used across all product surfaces."
      />
      <GuidedTry />

      <div className="bh-card" style={{ marginTop: 20 }}>
        <div className="bh-card__title">What makes a result set good?</div>
        <p className="bh-card__body">
          Retrieval quality here tracks two measured properties of the serving
          model{deployed?.version ? <> (<code>{deployed.version}</code>)</> : null}:{" "}
          <strong>effective rank</strong> — how many embedding dimensions carry
          signal{typeof deployed?.effectiveRank === "number" ? <> (currently {deployed.effectiveRank.toFixed(1)})</> : null};
          collapsed models rank everything alike — and <strong>nDCG@10</strong> —
          how well the top-10 ordering matches relevance judgments
          {typeof deployed?.ndcg10 === "number" ? <> (currently {deployed.ndcg10.toFixed(3)})</> : null}.
          Both must clear the deploy gate (Spec 0008) before a model serves this
          page. Method details in the <Link href="/research">experiment museum</Link>;
          measured results in EVIDENCE.md.
        </p>
      </div>
    </>
  );
}

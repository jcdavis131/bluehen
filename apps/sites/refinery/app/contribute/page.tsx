import { PageHeader } from "@synthaembed/ui-fleet";
import { getSiteCircuit } from "@synthaembed/fleet";
import { ContributeForm } from "../../components/ContributeForm";
import { OrgByline } from "../../components/OrgByline";

export const metadata = { title: "Contribute" };

export default function ContributePage() {
  const surface = getSiteCircuit("refinery");
  return (
    <>
      <PageHeader
        eyebrow={surface?.eyebrow}
        title="Contribute data — on your terms"
        lead="Contributions are stored only with explicit consent, carry a provenance receipt, and pass human review before entering the catalog. You see exactly what will be stored before you send it."
      >
        <OrgByline />
      </PageHeader>
      <ContributeForm />
    </>
  );
}

/** Add the slasso RAG Certification product (Spec 0015, SITE-009).
 *
 *   npx medusa exec ./src/scripts/add-certification.ts
 *
 * Price is a placeholder pending Operator pricing decision — adjust in
 * Medusa Admin. Idempotence: skips if the handle already exists.
 */

import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";

export default async function addCertification({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: "rag-certification-run" },
  });
  if (existing.length > 0) {
    logger.info("rag-certification-run already exists; skipping");
    return;
  }

  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  const [channel] = await salesChannelModule.listSalesChannels({ name: "Hub Storefront" });

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "RAG Certification Run",
          handle: "rag-certification-run",
          description:
            "One reproducible benchmark run of your retrieval stack on the shared " +
            "harness — nDCG@10, effective rank, latency — with pinned versions, a " +
            "reproduction script, and a published scorecard on slasso.com if the " +
            "tier thresholds are cleared.",
          status: ProductStatus.PUBLISHED,
          sales_channels: channel ? [{ id: channel.id }] : undefined,
          options: [{ title: "Tier", values: ["Standard"] }],
          variants: [
            {
              title: "Standard",
              sku: "RAG-CERT-STD",
              options: { Tier: "Standard" },
              manage_inventory: false,
              prices: [{ currency_code: "usd", amount: 1500_00 }],
            },
          ],
        },
      ],
    },
  });
  logger.info("RAG Certification Run added (USD 1500.00 placeholder — set final price in Admin)");
}

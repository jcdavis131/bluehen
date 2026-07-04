/** Add the Refinery dataset corpus product (Spec 0021 P3, MON-005).
 *
 *   npx medusa exec ./src/scripts/add-dataset-corpus.ts
 *
 * One product covers any catalog slug — fulfillment keys off cart metadata
 * `dataset_slug`. Price is a placeholder pending Operator pricing.
 */

import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";

export default async function addDatasetCorpus({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: "dataset-full-corpus" },
  });
  if (existing.length > 0) {
    logger.info("dataset-full-corpus already exists; skipping");
    return;
  }

  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  const [channel] = await salesChannelModule.listSalesChannels({ name: "Hub Storefront" });

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Refinery Dataset — Full Corpus",
          handle: "dataset-full-corpus",
          description:
            "One-time purchase of a provenance-carrying OKF dataset from the Data Refinery catalog. " +
            "Delivers the full chunks.jsonl corpus via a time-limited signed URL after checkout.",
          status: ProductStatus.PUBLISHED,
          sales_channels: channel ? [{ id: channel.id }] : undefined,
          options: [{ title: "Access", values: ["Full corpus"] }],
          variants: [
            {
              title: "Full corpus",
              sku: "REFINERY-DATASET-FULL",
              options: { Access: "Full corpus" },
              manage_inventory: false,
              prices: [{ currency_code: "usd", amount: 499_00 }],
            },
          ],
        },
      ],
    },
  });

  const variantId = result?.[0]?.variants?.[0]?.id;
  logger.info(
    `dataset-full-corpus added (USD 499.00 placeholder). Set REFINERY_DATASET_VARIANT_ID=${variantId ?? "variant_..."} on refinery.`,
  );
}

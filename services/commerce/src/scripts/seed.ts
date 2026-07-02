/** Seed the store: USD region, default sales channel, publishable key, and
 * the two self-serve products referenced on hub /pricing and /store.
 *
 *   npx medusa exec ./src/scripts/seed.ts
 *
 * Prints MEDUSA_PUBLISHABLE_KEY and MEDUSA_REGION_ID for the hub env.
 * Idempotence: intended for a fresh database; re-running creates duplicates.
 */

import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seed({ container }: ExecArgs) {
  const logger = container.resolve("logger");

  const { result: [salesChannel] } = await createSalesChannelsWorkflow(container).run({
    input: { salesChannelsData: [{ name: "Hub Storefront" }] },
  });

  const { result: [region] } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "United States",
          currency_code: "usd",
          countries: ["us"],
          payment_providers: process.env.STRIPE_API_KEY ? ["pp_stripe_stripe"] : undefined,
        },
      ],
    },
  });

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Evaluation Credits — 10 pack",
          handle: "evaluation-credits-10",
          description:
            "Ten benchmark evaluations on the shared harness: your corpus, measured " +
            "nDCG@10 and effective rank against published baselines, reproducible reports.",
          status: ProductStatus.PUBLISHED,
          sales_channels: [{ id: salesChannel.id }],
          options: [{ title: "Package", values: ["10 evaluations"] }],
          variants: [
            {
              title: "10 evaluations",
              sku: "EVAL-CREDITS-10",
              options: { Package: "10 evaluations" },
              manage_inventory: false,
              prices: [{ currency_code: "usd", amount: 500_00 }],
            },
          ],
        },
        {
          title: "Design Partner Seat",
          handle: "design-partner-seat",
          description:
            "One design-partner seat: a dedicated tenant workspace, monthly retraining " +
            "with deploy gates, and direct input into the platform roadmap. First cohort.",
          status: ProductStatus.PUBLISHED,
          sales_channels: [{ id: salesChannel.id }],
          options: [{ title: "Term", values: ["Quarterly"] }],
          variants: [
            {
              title: "Quarterly",
              sku: "DESIGN-PARTNER-Q",
              options: { Term: "Quarterly" },
              manage_inventory: false,
              prices: [{ currency_code: "usd", amount: 2500_00 }],
            },
          ],
        },
      ],
    },
  });

  const { result: [apiKey] } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [{ title: "Hub storefront", type: "publishable", created_by: "seed" }],
    },
  });
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKey.id, add: [salesChannel.id] },
  });

  logger.info("Seed complete. Hub env values:");
  logger.info(`  MEDUSA_PUBLISHABLE_KEY=${apiKey.token}`);
  logger.info(`  MEDUSA_REGION_ID=${region.id}`);
}

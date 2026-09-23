import type { MedusaContainer } from "@medusajs/framework";
import {
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
} from "@medusajs/medusa/core-flows";
import { SEED_REGIONS } from "../data/regions";
import { toKey } from "./utils";

export const getProductPrices = (handle: string) => {
  const key = toKey(handle);
  const amountByCurrency = new Map<string, number>();

  for (const seedRegion of SEED_REGIONS) {
    const amount = seedRegion.product_prices[key];
    if (amount === undefined) {
      throw new Error(
        `Missing price for product "${handle}" in region "${seedRegion.name}".`,
      );
    }
    amountByCurrency.set(seedRegion.currency_code, amount);
  }

  return Array.from(amountByCurrency, ([currency_code, amount]) => ({
    currency_code,
    amount,
  }));
};

export const seedRegions = async (container: MedusaContainer) => {
  await createRegionsWorkflow(container).run({
    input: {
      regions: SEED_REGIONS.map((seedRegion) => ({
        name: seedRegion.name,
        currency_code: seedRegion.currency_code,
        countries: seedRegion.countries,
        payment_providers: ["pp_system_default"],
      })),
    },
  });
};

export const seedTaxRegions = async (container: MedusaContainer) => {
  await createTaxRegionsWorkflow(container).run({
    input: SEED_REGIONS.flatMap((seedRegion) =>
      seedRegion.countries.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    ),
  });
};

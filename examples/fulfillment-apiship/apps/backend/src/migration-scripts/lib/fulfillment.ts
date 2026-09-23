import type { MedusaContainer } from "@medusajs/framework";
import { ModuleRegistrationName, Modules } from "@medusajs/framework/utils";
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows";
import {
  SEED_FULFILLMENT_PROVIDER_IDS,
  SEED_SHIPPING_OPTIONS,
} from "../data/fulfillment";
import { SEED_REGIONS } from "../data/regions";
import { getStockLocationsByName } from "./stock-locations";
import { getLink, getQuery } from "./utils";

export const getShippingProfile = async (container: MedusaContainer) => {
  const { data } = await getQuery(container).graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  return data[0];
};

export const seedFulfillment = async (container: MedusaContainer) => {
  const link = getLink(container);
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT,
  );
  const shippingProfile = await getShippingProfile(container);
  const stockLocationsByName = await getStockLocationsByName(container);

  for (const seedRegion of SEED_REGIONS) {
    const stockLocation = stockLocationsByName.get(
      seedRegion.stock_location.name,
    );
    if (!stockLocation) {
      throw new Error(
        `Missing stock location "${seedRegion.stock_location.name}" for region "${seedRegion.name}".`,
      );
    }

    for (const providerId of SEED_FULFILLMENT_PROVIDER_IDS) {
      await link.create({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: stockLocation.id,
        },
        [Modules.FULFILLMENT]: {
          fulfillment_provider_id: providerId,
        },
      });
    }

    const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets(
      {
        name: `${seedRegion.stock_location.name} shipping`,
        type: "shipping",
        service_zones: [
          {
            name: seedRegion.name,
            geo_zones: seedRegion.countries.map((country_code) => ({
              country_code,
              type: "country" as const,
            })),
          },
        ],
      },
    );

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    });

    await createShippingOptionsWorkflow(container).run({
      input: SEED_SHIPPING_OPTIONS.map((shippingOption) => ({
        name: shippingOption.name,
        price_type: "flat" as const,
        provider_id: shippingOption.provider_id,
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: shippingOption.label,
          description: shippingOption.description,
          code: shippingOption.code,
        },
        metadata: shippingOption.metadata,
        prices: [
          {
            currency_code: seedRegion.currency_code,
            amount: seedRegion.shipping_prices[shippingOption.code],
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq" as const,
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq" as const,
          },
        ],
      })),
    });
  }
};

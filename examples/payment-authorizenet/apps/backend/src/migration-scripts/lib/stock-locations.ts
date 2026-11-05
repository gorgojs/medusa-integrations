import type { MedusaContainer } from "@medusajs/framework";
import {
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";
import { SEED_REGIONS } from "../data/regions";
import { getSalesChannel } from "./store";
import { getQuery } from "./utils";

export const getStockLocations = async (container: MedusaContainer) => {
  const { data } = await getQuery(container).graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });
  return data;
};

export const getStockLocationsByName = async (container: MedusaContainer) => {
  const stockLocations = await getStockLocations(container);
  return new Map(
    stockLocations.map((stockLocation) => [stockLocation.name, stockLocation]),
  );
};

export const seedStockLocations = async (container: MedusaContainer) => {
  await createStockLocationsWorkflow(container).run({
    input: {
      locations: SEED_REGIONS.map((seedRegion) => seedRegion.stock_location),
    },
  });

  const salesChannel = await getSalesChannel(container);
  const stockLocations = await getStockLocations(container);

  for (const stockLocation of stockLocations) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocation.id, add: [salesChannel.id] },
    });
  }
};

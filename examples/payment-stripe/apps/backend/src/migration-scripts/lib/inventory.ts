import type { MedusaContainer } from "@medusajs/framework";
import { createInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows";
import { getStockLocations } from "./stock-locations";
import { getQuery } from "./utils";

const STOCKED_QUANTITY = 1000000;

export const seedInventoryLevels = async (container: MedusaContainer) => {
  const { data: inventoryItems } = await getQuery(container).graph({
    entity: "inventory_item",
    fields: ["id"],
  });
  const stockLocations = await getStockLocations(container);

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryItems.flatMap((inventoryItem) =>
        stockLocations.map((stockLocation) => ({
          location_id: stockLocation.id,
          stocked_quantity: STOCKED_QUANTITY,
          inventory_item_id: inventoryItem.id,
        })),
      ),
    },
  });
};

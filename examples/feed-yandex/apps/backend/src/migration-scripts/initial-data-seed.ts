import type { MedusaContainer } from "@medusajs/framework";
import {
  isAlreadySeeded,
  seedCategories,
  seedCollections,
  seedFulfillment,
  seedInventoryLevels,
  seedProductOptionMetadata,
  seedProductOptions,
  seedProducts,
  seedRegions,
  seedStockLocations,
  seedStore,
  seedTaxRegions,
  seedTranslations,
  step,
} from "./lib";

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  if (await isAlreadySeeded(container)) return;

  await step(seedStore(container), "store data");
  await step(seedRegions(container), "regions");
  await step(seedTaxRegions(container), "tax regions");
  await step(seedStockLocations(container), "stock locations");
  await step(seedFulfillment(container), "fulfillment data");
  await step(seedCategories(container), "product categories");
  await step(seedProductOptions(container), "product options");
  await step(seedProducts(container), "products");
  await step(seedProductOptionMetadata(container), "product option metadata");
  await step(seedCollections(container), "product collections");
  await step(seedTranslations(container), "translations");
  await step(seedInventoryLevels(container), "inventory levels");
}

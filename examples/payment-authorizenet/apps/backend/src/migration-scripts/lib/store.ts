import type { MedusaContainer } from "@medusajs/framework";
import { logger } from "@medusajs/framework/logger";
import {
  createApiKeysWorkflow,
  createSalesChannelsWorkflow,
  createStoresWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows";
import { SEED_LOCALES } from "../data/i18n";
import { SEED_REGIONS } from "../data/regions";
import { SEED_STORE } from "../data/store";
import { getQuery } from "./utils";

export const getSalesChannel = async (container: MedusaContainer) => {
  const { data } = await getQuery(container).graph({
    entity: "sales_channel",
    fields: ["id"],
    filters: { name: SEED_STORE.sales_channel.name },
  });
  return data[0];
};

export const isAlreadySeeded = async (container: MedusaContainer) => {
  const salesChannel = await getSalesChannel(container);
  if (!salesChannel) return false;

  logger.info("Store already seeded — skipping initial data seed.");
  return true;
};

export const seedStore = async (container: MedusaContainer) => {
  const {
    result: [salesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: { salesChannelsData: [SEED_STORE.sales_channel] },
  });

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: SEED_STORE.publishable_api_key.title,
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableApiKey.id, add: [salesChannel.id] },
  });

  const currencyCodes = Array.from(
    new Set(SEED_REGIONS.map((seedRegion) => seedRegion.currency_code)),
  );

  if (!currencyCodes.includes(SEED_STORE.default_currency_code)) {
    throw new Error(
      `Default currency "${SEED_STORE.default_currency_code}" has no region. Use one of: ${currencyCodes.join(", ")}.`,
    );
  }

  await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: SEED_STORE.name,
          supported_currencies: currencyCodes.map((currency_code) => ({
            currency_code,
            is_default: currency_code === SEED_STORE.default_currency_code,
          })),
          supported_locales: SEED_LOCALES.map((locale_code) => ({
            locale_code,
          })),
          default_sales_channel_id: salesChannel.id,
        },
      ],
    },
  });
};

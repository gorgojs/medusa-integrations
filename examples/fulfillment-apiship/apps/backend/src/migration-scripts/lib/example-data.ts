import type { MedusaContainer } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";
import {
  createShippingOptionsWorkflow,
  createTranslationsWorkflow,
  deleteShippingOptionsWorkflow,
  deleteTranslationsWorkflow,
} from "@medusajs/medusa/core-flows";
import { SEED_LOCALES, SEED_TRANSLATIONS } from "../data/i18n";
import { SEED_REGIONS } from "../data/regions";
import { getShippingProfile } from "./fulfillment";
import { getStockLocationsByName } from "./stock-locations";
import { getLink, getQuery } from "./utils";

const APISHIP_PROVIDER_ID = integrationProviderKey("apiship", "apiship-1");
const APISHIP_FULFILLMENT_PROVIDER_ID = "apiship_apiship";

/**
 * ApiShip aggregates Russian carriers and quotes in rubles, so the example puts its
 * shipping options in the one seeded region they apply to.
 */
const APISHIP_REGION_COUNTRY = "ru";

const APISHIP_SHIPPING_OPTIONS = [
  {
    id: "apiship_doortodoor",
    rank: 1,
    name: "Доставка курьером",
    translationKey: "courier",
    label: "ApiShip",
    description: "A carrier picks the parcel up and delivers it to the door.",
    deliveryType: 1,
    pickupType: 1,
  },
  {
    id: "apiship_doortopoint",
    rank: 2,
    name: "Самовывоз",
    translationKey: "pickup",
    label: "ApiShip",
    description: "A carrier picks the parcel up and delivers it to a pickup point.",
    deliveryType: 2,
    pickupType: 1,
  },
];

const getApishipRegion = () => {
  const seedRegion = SEED_REGIONS.find((region) =>
    region.countries.includes(APISHIP_REGION_COUNTRY),
  );

  if (!seedRegion) {
    throw new Error(
      `No seeded region covers "${APISHIP_REGION_COUNTRY}", so ApiShip has nowhere to ship.`,
    );
  }

  return seedRegion;
};

/**
 * Writes the credentials and the defaults an ApiShip order is filled in from. The token is
 * the one value that cannot be guessed, so it is left empty when the environment carries
 * none and the Admin asks for it instead. Everything else is a demo value, and the sender
 * details repeat the seeded warehouse so a created order has an address to ship from.
 */
const seedIntegration = async (container: MedusaContainer) => {
  const token = process.env.SEED_APISHIP_TOKEN;
  const seedRegion = getApishipRegion();

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: APISHIP_PROVIDER_ID,
      values: {
        ...(token ? { token } : {}),
        is_test: process.env.SEED_APISHIP_IS_TEST !== "false",
        is_cod: false,
        default_product_length: 10,
        default_product_width: 10,
        default_product_height: 10,
        default_product_weight: 500,
        sender_country_code: seedRegion.stock_location.address.country_code.toUpperCase(),
        sender_address_string: seedRegion.stock_location.address.address_1,
        sender_contact_name: process.env.STORE_NAME || "Gorgo Medusa Store",
        sender_phone: process.env.STORE_PHONE || "",
        sender_company: process.env.STORE_NAME || "Gorgo Medusa Store",
      },
    },
  });
};

const removeShippingOptions = async (
  container: MedusaContainer,
  shippingOptionIds: string[],
) => {
  if (!shippingOptionIds.length) return;

  const translations = await container
    .resolve(Modules.TRANSLATION)
    .listTranslations({ reference_id: shippingOptionIds }, { select: ["id"] });

  await deleteShippingOptionsWorkflow(container).run({
    input: { ids: shippingOptionIds },
  });

  if (translations.length) {
    await deleteTranslationsWorkflow(container).run({
      input: { ids: translations.map((translation) => translation.id) },
    });
  }
};

const translateShippingOptions = async (
  container: MedusaContainer,
  shippingOptions: { id: string; name: string }[],
) => {
  const translations = APISHIP_SHIPPING_OPTIONS.flatMap((seedOption) => {
    const shippingOption = shippingOptions.find(
      (option) => option.name === seedOption.name,
    );
    if (!shippingOption) return [];

    return SEED_LOCALES.flatMap((locale) => {
      const name =
        SEED_TRANSLATIONS[locale].shippingOptions[seedOption.translationKey];

      return name
        ? [
            {
              reference: "shipping_option",
              reference_id: shippingOption.id,
              locale_code: locale,
              translations: { name },
            },
          ]
        : [];
    });
  });

  await createTranslationsWorkflow(container).run({ input: { translations } });
};

const seedShippingOptions = async (container: MedusaContainer) => {
  const link = getLink(container);
  const seedRegion = getApishipRegion();
  const stockLocationsByName = await getStockLocationsByName(container);
  const stockLocation = stockLocationsByName.get(seedRegion.stock_location.name);

  if (!stockLocation) {
    throw new Error(
      `Missing stock location "${seedRegion.stock_location.name}" for region "${seedRegion.name}".`,
    );
  }

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: APISHIP_FULFILLMENT_PROVIDER_ID,
    },
  });

  const { data: stockLocations } = await getQuery(container).graph({
    entity: "stock_location",
    fields: [
      "id",
      "fulfillment_sets.type",
      "fulfillment_sets.service_zones.id",
      "fulfillment_sets.service_zones.shipping_options.id",
    ],
    filters: { id: stockLocation.id },
  });

  const serviceZone = stockLocations[0]?.fulfillment_sets?.find(
    (fulfillmentSet) => fulfillmentSet?.type === "shipping",
  )?.service_zones?.[0];

  if (!serviceZone) {
    throw new Error(
      `Stock location "${seedRegion.stock_location.name}" has no shipping service zone to add ApiShip to.`,
    );
  }

  await removeShippingOptions(
    container,
    (serviceZone.shipping_options ?? []).flatMap((shippingOption) =>
      shippingOption ? [shippingOption.id] : [],
    ),
  );

  const shippingProfile = await getShippingProfile(container);

  const { result: shippingOptions } = await createShippingOptionsWorkflow(
    container,
  ).run({
    input: APISHIP_SHIPPING_OPTIONS.map((shippingOption) => ({
      name: shippingOption.name,
      price_type: "calculated" as const,
      provider_id: APISHIP_FULFILLMENT_PROVIDER_ID,
      service_zone_id: serviceZone.id,
      shipping_profile_id: shippingProfile.id,
      type: {
        label: shippingOption.label,
        description: shippingOption.description,
        code: shippingOption.id,
      },
      metadata: { rank: shippingOption.rank },
      data: {
        id: shippingOption.id,
        deliveryType: shippingOption.deliveryType,
        pickupType: shippingOption.pickupType,
      },
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

  await translateShippingOptions(container, shippingOptions);
};

export const seedExampleData = async (container: MedusaContainer) => {
  await seedIntegration(container);
  await seedShippingOptions(container);
};

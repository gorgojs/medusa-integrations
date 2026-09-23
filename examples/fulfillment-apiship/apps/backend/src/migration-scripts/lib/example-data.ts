import type { MedusaContainer } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";
import { createShippingOptionsWorkflow } from "@medusajs/medusa/core-flows";
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

/**
 * The four routes ApiShip's fulfillment provider offers, as `getFulfillmentOptions`
 * returns them. `deliveryType` decides what the checkout asks the customer for, a courier
 * tariff for 1 and a pickup point for 2, and `pickupType` decides where the parcel is
 * handed over, at the warehouse for 1 and at an intake point for 2.
 *
 * Handing a parcel over at an intake point needs a connection with that point configured
 * under Settings -> Integrations -> ApiShip, so the two options that require one are
 * seeded disabled rather than shown to a customer who cannot be served.
 */
const APISHIP_SHIPPING_OPTIONS = [
  {
    id: "apiship_doortodoor",
    name: "ApiShip courier",
    label: "ApiShip",
    description: "A carrier picks the parcel up and delivers it to the door.",
    deliveryType: 1,
    pickupType: 1,
    enabledInStore: true,
  },
  {
    id: "apiship_doortopoint",
    name: "ApiShip pickup point",
    label: "ApiShip",
    description: "A carrier picks the parcel up and delivers it to a pickup point.",
    deliveryType: 2,
    pickupType: 1,
    enabledInStore: true,
  },
  {
    id: "apiship_pointtodoor",
    name: "ApiShip courier (drop-off)",
    label: "ApiShip",
    description:
      "You drop the parcel off at an intake point and it is delivered to the door.",
    deliveryType: 1,
    pickupType: 2,
    enabledInStore: false,
  },
  {
    id: "apiship_pointtopoint",
    name: "ApiShip pickup point (drop-off)",
    label: "ApiShip",
    description:
      "You drop the parcel off at an intake point and it is delivered to a pickup point.",
    deliveryType: 2,
    pickupType: 2,
    enabledInStore: false,
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

/**
 * Offers ApiShip alongside the flat-rate options the starter seeds. Every region already
 * has a fulfillment set whose service zone covers its own countries, so the options join
 * the Russian one rather than bringing a second set of their own. A fulfillment provider
 * has to be available at the stock location before the service zone can offer it, hence
 * the link.
 */
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
    fields: ["id", "fulfillment_sets.type", "fulfillment_sets.service_zones.id"],
    filters: { id: stockLocation.id },
  });

  const serviceZoneId = stockLocations[0]?.fulfillment_sets?.find(
    (fulfillmentSet) => fulfillmentSet?.type === "shipping",
  )?.service_zones?.[0]?.id;

  if (!serviceZoneId) {
    throw new Error(
      `Stock location "${seedRegion.stock_location.name}" has no shipping service zone to add ApiShip to.`,
    );
  }

  const shippingProfile = await getShippingProfile(container);

  await createShippingOptionsWorkflow(container).run({
    input: APISHIP_SHIPPING_OPTIONS.map((shippingOption) => ({
      name: shippingOption.name,
      // ApiShip quotes every parcel against the carriers, so the price is only known
      // once the customer has picked a tariff.
      price_type: "calculated" as const,
      provider_id: APISHIP_FULFILLMENT_PROVIDER_ID,
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfile.id,
      type: {
        label: shippingOption.label,
        description: shippingOption.description,
        code: shippingOption.id,
      },
      data: {
        id: shippingOption.id,
        deliveryType: shippingOption.deliveryType,
        pickupType: shippingOption.pickupType,
      },
      rules: [
        {
          attribute: "enabled_in_store",
          value: shippingOption.enabledInStore ? "true" : "false",
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
};

export const seedExampleData = async (container: MedusaContainer) => {
  await seedIntegration(container);
  await seedShippingOptions(container);
};

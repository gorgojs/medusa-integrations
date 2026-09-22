import type { MedusaContainer } from "@medusajs/framework";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";
import { getQuery } from "./utils";

const TKASSA_PROVIDER_ID = integrationProviderKey("tkassa", "tkassa-1");
const YOOKASSA_PROVIDER_ID = integrationProviderKey("yookassa", "yookassa-1");
const ROBOKASSA_PROVIDER_ID = integrationProviderKey("robokassa", "robokassa-1");
const APISHIP_PROVIDER_ID = integrationProviderKey("apiship", "apiship-1");
const ONEC_PROVIDER_ID = integrationProviderKey("1c", "1c-1");

const TKASSA_PAYMENT_PROVIDER_ID = "pp_tkassa_tkassa";
const YOOKASSA_PAYMENT_PROVIDER_ID = "pp_yookassa_yookassa";
const ROBOKASSA_PAYMENT_PROVIDER_ID = "pp_robokassa_robokassa";

/**
 * Configures every registered integration provider through the Integration Module: the
 * behavior settings always (auto-capture and receipts for the three payment providers; test
 * mode, cash-on-delivery and default package dimensions for ApiShip; the sync defaults for
 * 1C), and credentials when their SEED_* env vars are set. ApiShip's sender address and 1C's
 * product attribute mappings are store-specific, so — like a missing credential — they are
 * left blank for Admin.
 */
const seedIntegrations = async (container: MedusaContainer) => {
  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: TKASSA_PROVIDER_ID,
      values: {
        ...(process.env.SEED_TKASSA_TERMINAL_KEY
          ? { terminalKey: process.env.SEED_TKASSA_TERMINAL_KEY }
          : {}),
        ...(process.env.SEED_TKASSA_PASSWORD
          ? { password: process.env.SEED_TKASSA_PASSWORD }
          : {}),
        capture: true,
        useReceipt: true,
        ffdVersion: "1.2",
        taxation: "osn", // general taxation system
        taxItemDefault: "none", // no VAT
        taxShippingDefault: "none", // no VAT
      },
    },
  });

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: YOOKASSA_PROVIDER_ID,
      values: {
        ...(process.env.SEED_YOOKASSA_SHOP_ID
          ? { shopId: process.env.SEED_YOOKASSA_SHOP_ID }
          : {}),
        ...(process.env.SEED_YOOKASSA_SECRET_KEY
          ? { secretKey: process.env.SEED_YOOKASSA_SECRET_KEY }
          : {}),
        capture: true,
        paymentDescription: "Test payment",
        useReceipt: true,
        useAtolOnlineFFD120: true,
        taxSystemCode: 1, // general taxation system
        taxItemDefault: 1, // no VAT
        taxShippingDefault: 1, // no VAT
      },
    },
  });

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: ROBOKASSA_PROVIDER_ID,
      values: {
        ...(process.env.SEED_ROBOKASSA_MERCHANT_LOGIN
          ? { merchantLogin: process.env.SEED_ROBOKASSA_MERCHANT_LOGIN }
          : {}),
        ...(process.env.SEED_ROBOKASSA_PASSWORD1
          ? { password1: process.env.SEED_ROBOKASSA_PASSWORD1 }
          : {}),
        ...(process.env.SEED_ROBOKASSA_PASSWORD2
          ? { password2: process.env.SEED_ROBOKASSA_PASSWORD2 }
          : {}),
        hashAlgorithm: "md5",
        capture: true,
        useReceipt: true,
        taxation: "osn", // general taxation system
        taxItemDefault: "none", // no VAT
        taxShippingDefault: "none", // no VAT
      },
    },
  });

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: APISHIP_PROVIDER_ID,
      values: {
        ...(process.env.SEED_APISHIP_TOKEN
          ? { token: process.env.SEED_APISHIP_TOKEN }
          : {}),
        is_test: true,
        is_cod: false,
        delivery_cost_vat: -1, // no VAT
        default_product_length: 10, // cm
        default_product_width: 10, // cm
        default_product_height: 10, // cm
        default_product_weight: 20, // grams
      },
    },
  });

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: ONEC_PROVIDER_ID,
      values: {
        interval: 0,
        chunkSize: 10 * 1024 * 1024,
        useZip: false,
      },
    },
  });
};

/**
 * Offers T-Kassa, YooKassa and Robokassa in every region. `seedRegions` creates them with
 * Medusa's default payment provider only, the way the starter does, so the three providers this
 * example demonstrates are added here rather than in the region data. Updating
 * `payment_providers` replaces the region's providers, so the list carries over what the
 * regions already have. Every seeded region gets the same set, which is why one union covers
 * them all.
 */
const seedRegionPaymentProviders = async (container: MedusaContainer) => {
  const { data: regions } = await getQuery(container).graph({
    entity: "region",
    fields: ["payment_providers.id"],
  });

  const paymentProviderIds = new Set<string>(
    regions.flatMap((region) =>
      (region.payment_providers ?? []).flatMap((provider) =>
        provider ? [provider.id] : [],
      ),
    ),
  );
  paymentProviderIds.add(TKASSA_PAYMENT_PROVIDER_ID);
  paymentProviderIds.add(YOOKASSA_PAYMENT_PROVIDER_ID);
  paymentProviderIds.add(ROBOKASSA_PAYMENT_PROVIDER_ID);

  await updateRegionsWorkflow(container).run({
    input: {
      selector: {},
      update: { payment_providers: Array.from(paymentProviderIds) },
    },
  });
};

export const seedExampleData = async (container: MedusaContainer) => {
  await seedIntegrations(container);
  await seedRegionPaymentProviders(container);
};

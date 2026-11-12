import type { MedusaContainer } from "@medusajs/framework";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";
import { createFeedsWorkflow } from "@gorgo/medusa-feed-yandex/workflows/create-feeds";
import { updateFeedsWorkflow } from "@gorgo/medusa-feed-yandex/workflows/update-feeds";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";
import { getQuery } from "./utils";

const TKASSA_PROVIDER_ID = integrationProviderKey("tkassa", "tkassa-1");
const YOOKASSA_PROVIDER_ID = integrationProviderKey("yookassa", "yookassa-1");
const ROBOKASSA_PROVIDER_ID = integrationProviderKey("robokassa", "robokassa-1");
const APISHIP_PROVIDER_ID = integrationProviderKey("apiship", "apiship-1");
const ONEC_PROVIDER_ID = integrationProviderKey("1c", "1c-1");
const STRIPE_PROVIDER_ID = integrationProviderKey("stripe", "stripe-1");
const PAYPAL_PROVIDER_ID = integrationProviderKey("paypal", "paypal-1");
const AUTHORIZENET_PROVIDER_ID = integrationProviderKey(
  "authorizenet",
  "authorizenet-1",
);
const MOLLIE_PROVIDER_ID = integrationProviderKey("mollie", "mollie-1");

const TKASSA_PAYMENT_PROVIDER_ID = "pp_tkassa_tkassa";
const YOOKASSA_PAYMENT_PROVIDER_ID = "pp_yookassa_yookassa";
const ROBOKASSA_PAYMENT_PROVIDER_ID = "pp_robokassa_robokassa";
const STRIPE_PAYMENT_PROVIDER_ID = "pp_stripe_stripe";
const PAYPAL_PAYMENT_PROVIDER_ID = "pp_paypal_paypal";
const AUTHORIZENET_PAYMENT_PROVIDER_ID = "pp_authorizenet_authorizenet";
const MOLLIE_PAYMENT_PROVIDER_ID = "pp_mollie_mollie";

const STRIPE_CURRENCIES = new Set([
  "aed", "afn", "all", "amd", "ang", "aoa", "ars", "aud", "awg", "azn", "bam", "bbd",
  "bdt", "bif", "bmd", "bnd", "bob", "brl", "bsd", "bwp", "byn", "bzd", "cad", "cdf",
  "chf", "clp", "cny", "cop", "crc", "cve", "czk", "djf", "dkk", "dop", "dzd", "egp",
  "etb", "eur", "fjd", "fkp", "gbp", "gel", "gip", "gmd", "gnf", "gtq", "gyd", "hkd",
  "hnl", "htg", "huf", "idr", "ils", "inr", "isk", "jmd", "jpy", "kes", "kgs", "khr",
  "kmf", "krw", "kyd", "kzt", "lak", "lbp", "lkr", "lrd", "lsl", "mad", "mdl", "mga",
  "mkd", "mmk", "mnt", "mop", "mur", "mvr", "mwk", "mxn", "myr", "mzn", "nad", "ngn",
  "nio", "nok", "npr", "nzd", "pab", "pen", "pgk", "php", "pkr", "pln", "pyg", "qar",
  "ron", "rsd", "rub", "rwf", "sar", "sbd", "scr", "sek", "sgd", "shp", "sle", "sos",
  "srd", "std", "szl", "thb", "tjs", "top", "try", "ttd", "twd", "tzs", "uah", "ugx",
  "usd", "uyu", "uzs", "vnd", "vuv", "wst", "xaf", "xcd", "xcg", "xof", "xpf", "yer",
  "zar", "zmw",
]);

const PAYPAL_CURRENCIES = new Set([
  "aud", "brl", "cad", "chf", "cny", "czk", "dkk", "eur", "gbp", "hkd", "huf", "ils", "jpy",
  "mxn", "myr", "nok", "nzd", "php", "pln", "rub", "sek", "sgd", "thb", "twd", "usd",
]);

const MOLLIE_CURRENCY = "eur";

const getAuthorizeNetCurrency = () =>
  (process.env.SEED_AUTHORIZENET_CURRENCY || "usd").toLowerCase();

/**
 * Configures every registered integration provider through the Integration Module: the
 * behavior settings always (auto-capture and receipts for T-Kassa, YooKassa and Robokassa;
 * auto-capture for Stripe, PayPal, Authorize.net and Mollie, in the sandbox where there is
 * one; test mode, cash-on-delivery and default package dimensions for ApiShip; the sync defaults for
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

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: STRIPE_PROVIDER_ID,
      values: {
        ...(process.env.SEED_STRIPE_SECRET_KEY
          ? { secretKey: process.env.SEED_STRIPE_SECRET_KEY }
          : {}),
        ...(process.env.SEED_STRIPE_PUBLISHABLE_KEY
          ? { publishableKey: process.env.SEED_STRIPE_PUBLISHABLE_KEY }
          : {}),
        ...(process.env.SEED_STRIPE_WEBHOOK_SECRET
          ? { webhookSecret: process.env.SEED_STRIPE_WEBHOOK_SECRET }
          : {}),
        capture: "automatic",
      },
    },
  });

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: PAYPAL_PROVIDER_ID,
      values: {
        ...(process.env.SEED_PAYPAL_CLIENT_ID
          ? { clientId: process.env.SEED_PAYPAL_CLIENT_ID }
          : {}),
        ...(process.env.SEED_PAYPAL_CLIENT_SECRET
          ? { clientSecret: process.env.SEED_PAYPAL_CLIENT_SECRET }
          : {}),
        ...(process.env.SEED_PAYPAL_WEBHOOK_ID
          ? { webhookId: process.env.SEED_PAYPAL_WEBHOOK_ID }
          : {}),
        environment: "sandbox",
        intent: "capture",
      },
    },
  });

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: AUTHORIZENET_PROVIDER_ID,
      values: {
        ...(process.env.SEED_AUTHORIZENET_API_LOGIN_ID
          ? { apiLoginId: process.env.SEED_AUTHORIZENET_API_LOGIN_ID }
          : {}),
        ...(process.env.SEED_AUTHORIZENET_TRANSACTION_KEY
          ? { transactionKey: process.env.SEED_AUTHORIZENET_TRANSACTION_KEY }
          : {}),
        ...(process.env.SEED_AUTHORIZENET_CLIENT_KEY
          ? { publicClientKey: process.env.SEED_AUTHORIZENET_CLIENT_KEY }
          : {}),
        ...(process.env.SEED_AUTHORIZENET_SIGNATURE_KEY
          ? { signatureKey: process.env.SEED_AUTHORIZENET_SIGNATURE_KEY }
          : {}),
        environment: "sandbox",
        capture: "automatic",
        googlePay: false,
      },
    },
  });

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: MOLLIE_PROVIDER_ID,
      values: {
        ...(process.env.SEED_MOLLIE_API_KEY
          ? { apiKey: process.env.SEED_MOLLIE_API_KEY }
          : {}),
        ...(process.env.SEED_MOLLIE_WEBHOOK_URL
          ? { webhookUrl: process.env.SEED_MOLLIE_WEBHOOK_URL }
          : {}),
        capture: "automatic",
      },
    },
  });
};

const getRegionPaymentProviderIds = (currencyCode: string) => {
  const ids = [
    TKASSA_PAYMENT_PROVIDER_ID,
    YOOKASSA_PAYMENT_PROVIDER_ID,
    ROBOKASSA_PAYMENT_PROVIDER_ID,
  ];
  if (STRIPE_CURRENCIES.has(currencyCode)) ids.push(STRIPE_PAYMENT_PROVIDER_ID);
  if (PAYPAL_CURRENCIES.has(currencyCode)) ids.push(PAYPAL_PAYMENT_PROVIDER_ID);
  if (currencyCode === getAuthorizeNetCurrency()) {
    ids.push(AUTHORIZENET_PAYMENT_PROVIDER_ID);
  }
  if (currencyCode === MOLLIE_CURRENCY) ids.push(MOLLIE_PAYMENT_PROVIDER_ID);
  return ids;
};

/**
 * Offers T-Kassa, YooKassa and Robokassa in every region, and Stripe, PayPal, Authorize.net and
 * Mollie in the regions whose currency each accepts. `seedRegions` creates them with Medusa's
 * default payment provider only, the way the starter does, so the providers this example
 * demonstrates are added here rather than in the region data. Updating `payment_providers`
 * replaces the region's providers, so the list carries over what the regions already have.
 * Regions of one currency get the same set, so the update runs once per currency.
 */
const seedRegionPaymentProviders = async (container: MedusaContainer) => {
  const { data: regions } = await getQuery(container).graph({
    entity: "region",
    fields: ["id", "currency_code", "payment_providers.id"],
  });

  const existingProviderIds = regions.flatMap((region) =>
    (region.payment_providers ?? []).flatMap((provider) =>
      provider ? [provider.id] : [],
    ),
  );

  const regionIdsByCurrency = new Map<string, string[]>();
  for (const region of regions) {
    const ids = regionIdsByCurrency.get(region.currency_code) ?? [];
    ids.push(region.id);
    regionIdsByCurrency.set(region.currency_code, ids);
  }

  for (const [currencyCode, regionIds] of regionIdsByCurrency) {
    const paymentProviderIds = new Set<string>([
      ...existingProviderIds,
      ...getRegionPaymentProviderIds(currencyCode),
    ]);

    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: regionIds },
        update: { payment_providers: Array.from(paymentProviderIds) },
      },
    });
  }
};

const seedFeeds = async (container: MedusaContainer) => {
  const {
    result: [feed],
  } = await createFeedsWorkflow(container).run({
    input: [
      {
        title: "Yandex Market Feed",
        file_name: "yandex-market",
        is_active: true,
      },
    ],
  });

  await updateFeedsWorkflow(container).run({
    input: [
      {
        id: feed.id,
        settings: {
          name: process.env.STORE_NAME || "Gorgo Medusa Store",
          url: process.env.STOREFRONT_URL || "http://localhost:8000",
        },
      },
    ],
  });
};

export const seedExampleData = async (container: MedusaContainer) => {
  await seedIntegrations(container);
  await seedRegionPaymentProviders(container);
  await seedFeeds(container);
};

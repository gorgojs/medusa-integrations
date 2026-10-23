import type { MedusaContainer } from "@medusajs/framework";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";
import { getQuery } from "./utils";

const STRIPE_PROVIDER_ID = integrationProviderKey("stripe", "stripe-1");
const STRIPE_PAYMENT_PROVIDER_ID = "pp_stripe_stripe";

const seedIntegration = async (container: MedusaContainer) => {
  const secretKey = process.env.SEED_STRIPE_SECRET_KEY;
  const publishableKey = process.env.SEED_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = process.env.SEED_STRIPE_WEBHOOK_SECRET;

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: STRIPE_PROVIDER_ID,
      values: {
        ...(secretKey ? { secretKey } : {}),
        ...(publishableKey ? { publishableKey } : {}),
        ...(webhookSecret ? { webhookSecret } : {}),
        capture: "automatic",
      },
    },
  });
};

/**
 * The presentment currencies Stripe accepts, from https://docs.stripe.com/currencies. Stripe
 * refuses a payment in any other, so a region in another currency does not get it. Which of these
 * an account can actually charge in still depends on its country.
 */
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

/**
 * Offers Stripe in every region whose currency it accepts. `seedRegions` creates them with
 * Medusa's default payment provider only, the way the starter does, so the provider this
 * example demonstrates is added here rather than in the region data. Updating
 * `payment_providers` replaces the region's providers, so the list carries over what the
 * regions already have. Every seeded region gets the same set, which is why one union covers
 * them all.
 */
const seedRegionPaymentProviders = async (container: MedusaContainer) => {
  const { data: regions } = await getQuery(container).graph({
    entity: "region",
    fields: ["id", "currency_code", "payment_providers.id"],
  });

  const paymentProviderIds = new Set<string>(
    regions.flatMap((region) =>
      (region.payment_providers ?? []).flatMap((provider) =>
        provider ? [provider.id] : [],
      ),
    ),
  );
  paymentProviderIds.add(STRIPE_PAYMENT_PROVIDER_ID);

  const regionIds = regions
    .filter((region) => STRIPE_CURRENCIES.has(region.currency_code))
    .map((region) => region.id);

  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: regionIds },
      update: { payment_providers: Array.from(paymentProviderIds) },
    },
  });
};

export const seedExampleData = async (container: MedusaContainer) => {
  await seedIntegration(container);
  await seedRegionPaymentProviders(container);
};

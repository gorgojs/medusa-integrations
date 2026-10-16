import type { MedusaContainer } from "@medusajs/framework";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";
import { getQuery } from "./utils";

const PAYPAL_PROVIDER_ID = integrationProviderKey("paypal", "paypal-1");
const PAYPAL_PAYMENT_PROVIDER_ID = "pp_paypal_paypal";

const seedIntegration = async (container: MedusaContainer) => {
  const clientId = process.env.SEED_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.SEED_PAYPAL_CLIENT_SECRET;
  const webhookId = process.env.SEED_PAYPAL_WEBHOOK_ID;

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: PAYPAL_PROVIDER_ID,
      values: {
        ...(clientId ? { clientId } : {}),
        ...(clientSecret ? { clientSecret } : {}),
        ...(webhookId ? { webhookId } : {}),
        environment: "sandbox",
        intent: "capture",
      },
    },
  });
};

/**
 * The currencies PayPal accepts, from https://developer.paypal.com/reference/currency-codes/.
 * The provider refuses a payment in any other, so a region in another currency does not get it.
 */
const PAYPAL_CURRENCIES = new Set([
  "aud", "brl", "cad", "chf", "cny", "czk", "dkk", "eur", "gbp", "hkd", "huf", "ils", "jpy",
  "mxn", "myr", "nok", "nzd", "php", "pln", "rub", "sek", "sgd", "thb", "twd", "usd",
]);

/**
 * Offers PayPal in every region whose currency it accepts. `seedRegions` creates them with
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
  paymentProviderIds.add(PAYPAL_PAYMENT_PROVIDER_ID);

  const regionIds = regions
    .filter((region) => PAYPAL_CURRENCIES.has(region.currency_code))
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

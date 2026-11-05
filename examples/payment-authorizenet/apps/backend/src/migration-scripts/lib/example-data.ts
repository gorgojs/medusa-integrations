import type { MedusaContainer } from "@medusajs/framework";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";
import { getQuery } from "./utils";

const AUTHORIZENET_PROVIDER_ID = integrationProviderKey(
  "authorizenet",
  "authorizenet-1",
);
const AUTHORIZENET_PAYMENT_PROVIDER_ID = "pp_authorizenet_authorizenet";

const seedIntegration = async (container: MedusaContainer) => {
  const apiLoginId = process.env.SEED_AUTHORIZENET_API_LOGIN_ID;
  const transactionKey = process.env.SEED_AUTHORIZENET_TRANSACTION_KEY;
  const publicClientKey = process.env.SEED_AUTHORIZENET_CLIENT_KEY;
  const signatureKey = process.env.SEED_AUTHORIZENET_SIGNATURE_KEY;

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: AUTHORIZENET_PROVIDER_ID,
      values: {
        ...(apiLoginId ? { apiLoginId } : {}),
        ...(transactionKey ? { transactionKey } : {}),
        ...(publicClientKey ? { publicClientKey } : {}),
        ...(signatureKey ? { signatureKey } : {}),
        environment: "sandbox",
        capture: "automatic",
        googlePay: false,
      },
    },
  });
};

/**
 * An Authorize.net account charges in a single currency, so the provider is offered only in the
 * regions that use it. It is `usd` unless `SEED_AUTHORIZENET_CURRENCY` says otherwise.
 */
const getCurrency = () =>
  (process.env.SEED_AUTHORIZENET_CURRENCY || "usd").toLowerCase();

/**
 * Offers Authorize.net in every region of the account's currency. `seedRegions` creates them with
 * Medusa's default payment provider only, the way the starter does, so the provider this example
 * demonstrates is added here rather than in the region data. Updating `payment_providers`
 * replaces the region's providers, so the list carries over what the regions already have. Every
 * seeded region gets the same set, which is why one union covers them all.
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
  paymentProviderIds.add(AUTHORIZENET_PAYMENT_PROVIDER_ID);

  const currency = getCurrency();
  const regionIds = regions
    .filter((region) => region.currency_code === currency)
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

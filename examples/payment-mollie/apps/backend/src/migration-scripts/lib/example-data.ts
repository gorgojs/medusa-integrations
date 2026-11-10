import type { MedusaContainer } from "@medusajs/framework";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";
import { getQuery } from "./utils";

const MOLLIE_PROVIDER_ID = integrationProviderKey("mollie", "mollie-1");
const MOLLIE_PAYMENT_PROVIDER_ID = "pp_mollie_mollie";

// Mollie's test mode takes euros only, so the provider is offered only in the regions that use them.
const MOLLIE_CURRENCY = "eur";

const seedIntegration = async (container: MedusaContainer) => {
  const apiKey = process.env.SEED_MOLLIE_API_KEY;
  const webhookUrl = process.env.SEED_MOLLIE_WEBHOOK_URL;

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: MOLLIE_PROVIDER_ID,
      values: {
        ...(apiKey ? { apiKey } : {}),
        ...(webhookUrl ? { webhookUrl } : {}),
        capture: "automatic",
      },
    },
  });
};

/**
 * Offers Mollie in every region that sells in euros. `seedRegions` creates them with Medusa's
 * default payment provider only, the way the starter does, so the provider this example
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
  paymentProviderIds.add(MOLLIE_PAYMENT_PROVIDER_ID);

  const regionIds = regions
    .filter((region) => region.currency_code === MOLLIE_CURRENCY)
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

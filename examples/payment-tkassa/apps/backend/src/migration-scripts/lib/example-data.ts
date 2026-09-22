import type { MedusaContainer } from "@medusajs/framework";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";
import { getQuery } from "./utils";

const TKASSA_PROVIDER_ID = integrationProviderKey("tkassa", "tkassa-1");
const TKASSA_PAYMENT_PROVIDER_ID = "pp_tkassa_tkassa";

const seedIntegration = async (container: MedusaContainer) => {
  const terminalKey = process.env.SEED_TKASSA_TERMINAL_KEY;
  const password = process.env.SEED_TKASSA_PASSWORD;

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: TKASSA_PROVIDER_ID,
      values: {
        ...(terminalKey ? { terminalKey } : {}),
        ...(password ? { password } : {}),
        capture: true,
        useReceipt: true,
        ffdVersion: "1.2",
        taxation: "osn", // general taxation system
        taxItemDefault: "none", // no VAT
        taxShippingDefault: "none", // no VAT
      },
    },
  });
};

/**
 * Offers T-Kassa in every region. `seedRegions` creates them with Medusa's default payment
 * provider only, the way the starter does, so the provider this example demonstrates is added
 * here rather than in the region data. Updating `payment_providers` replaces the region's
 * providers, so the list carries over what the regions already have. Every seeded region gets
 * the same set, which is why one union covers them all.
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

  await updateRegionsWorkflow(container).run({
    input: {
      selector: {},
      update: { payment_providers: Array.from(paymentProviderIds) },
    },
  });
};

export const seedExampleData = async (container: MedusaContainer) => {
  await seedIntegration(container);
  await seedRegionPaymentProviders(container);
};

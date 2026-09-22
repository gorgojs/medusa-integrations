import type { MedusaContainer } from "@medusajs/framework";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";
import { getQuery } from "./utils";

const ROBOKASSA_PROVIDER_ID = integrationProviderKey("robokassa", "robokassa-1");
const ROBOKASSA_PAYMENT_PROVIDER_ID = "pp_robokassa_robokassa";

const seedIntegration = async (container: MedusaContainer) => {
  const merchantLogin = process.env.SEED_ROBOKASSA_MERCHANT_LOGIN;
  const password1 = process.env.SEED_ROBOKASSA_PASSWORD1;
  const password2 = process.env.SEED_ROBOKASSA_PASSWORD2;

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: ROBOKASSA_PROVIDER_ID,
      values: {
        ...(merchantLogin ? { merchantLogin } : {}),
        ...(password1 ? { password1 } : {}),
        ...(password2 ? { password2 } : {}),
        hashAlgorithm: "md5",
        capture: true,
        useReceipt: true,
        taxation: "osn", // general taxation system
        taxItemDefault: "none", // no VAT
        taxShippingDefault: "none", // no VAT
      },
    },
  });
};

/**
 * Offers Robokassa in every region. `seedRegions` creates them with Medusa's default payment
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
  paymentProviderIds.add(ROBOKASSA_PAYMENT_PROVIDER_ID);

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

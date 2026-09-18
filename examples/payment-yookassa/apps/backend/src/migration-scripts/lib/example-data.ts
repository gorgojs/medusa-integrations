import type { MedusaContainer } from "@medusajs/framework";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";
import { getQuery } from "./utils";

const YOOKASSA_PROVIDER_ID = integrationProviderKey("yookassa", "yookassa-1");
const YOOKASSA_PAYMENT_PROVIDER_ID = "pp_yookassa_yookassa";

const seedIntegration = async (container: MedusaContainer) => {
  const shopId = process.env.SEED_YOOKASSA_SHOP_ID;
  const secretKey = process.env.SEED_YOOKASSA_SECRET_KEY;

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: YOOKASSA_PROVIDER_ID,
      values: {
        ...(shopId ? { shopId } : {}),
        ...(secretKey ? { secretKey } : {}),
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
};

/**
 * Offers YooKassa in every region. `seedRegions` creates them with Medusa's default payment
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
  paymentProviderIds.add(YOOKASSA_PAYMENT_PROVIDER_ID);

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

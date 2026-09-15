import type { MedusaContainer } from "@medusajs/framework";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";

const YOOKASSA_PROVIDER_ID = integrationProviderKey("yookassa", "yookassa-1");

export const seedExampleData = async (container: MedusaContainer) => {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

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

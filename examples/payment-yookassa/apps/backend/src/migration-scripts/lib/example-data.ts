import type { MedusaContainer } from "@medusajs/framework";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";

const YOOKASSA_PROVIDER_ID = integrationProviderKey("yookassa", "yookassa-1");

export const seedExampleData = async (container: MedusaContainer) => {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secretKey = process.env.YOOKASSA_SECRET_KEY;

  if (!shopId || !secretKey) return;

  await upsertIntegrationWorkflow(container).run({
    input: {
      provider_id: YOOKASSA_PROVIDER_ID,
      section_id: "credentials",
      values: { shopId, secretKey },
    },
  });
};

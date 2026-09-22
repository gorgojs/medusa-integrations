import type { MedusaContainer } from "@medusajs/framework";
import {
  integrationProviderKey,
  upsertIntegrationWorkflow,
} from "@gorgo/medusa-integration";

const ONEC_PROVIDER_ID = integrationProviderKey("1c", "1c-1");

/**
 * Configures 1C through the Integration Module: the sync defaults always. 1C has no credentials
 * to seed — it calls into this backend, not the other way around — so there is nothing
 * conditional on a SEED_* env var here. The product attribute mappings (height, width, weight,
 * mid_code, hs_code, origin_country) are store-specific, so they are left blank for Admin.
 */
export const seedExampleData = async (container: MedusaContainer) => {
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
};

import type { MedusaContainer } from "@medusajs/framework";
import { createFeedsWorkflow } from "@gorgo/medusa-feed-yandex/workflows/create-feeds";
import { updateFeedsWorkflow } from "@gorgo/medusa-feed-yandex/workflows/update-feeds";

/**
 * Creates a demo feed so Settings -> Feeds isn't empty. The shop name and URL default to
 * STORE_NAME/STOREFRONT_URL, already used for email branding elsewhere in this example. The
 * company and the categories to export are store-specific, so — like a payment provider's
 * credentials when its SEED_* env vars are unset — they are left blank for Admin to fill in.
 */
export const seedExampleData = async (container: MedusaContainer) => {
  const seedFeeds: { title: string; file_name: string; is_active: boolean }[] = [
    {
      title: "Yandex Market Feed",
      file_name: "yandex-market",
      is_active: true,
    },
  ];

  const {
    result: [feed],
  } = await createFeedsWorkflow(container).run({ input: seedFeeds });

  const feedSettings: {
    id: string;
    settings: { name?: string; url?: string };
  }[] = [
    {
      id: feed.id,
      settings: {
        name: process.env.STORE_NAME || "Gorgo Medusa Store",
        url: process.env.STOREFRONT_URL || "http://localhost:8000",
      },
    },
  ];

  await updateFeedsWorkflow(container).run({ input: feedSettings });
};

import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";

export default async function productUpdatedHandler({
  event,
}: SubscriberArgs<{ id: string }>) {
  const storefrontUrl = process.env.STOREFRONT_URL;
  const revalidateSecret = process.env.REVALIDATE_SECRET;

  if (!storefrontUrl) {
    console.warn(
      "[product-updated] STOREFRONT_URL is not set, skipping revalidation",
    );
    return;
  }

  try {
    const res = await fetch(`${storefrontUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(revalidateSecret && { "x-revalidate-secret": revalidateSecret }),
      },
      body: JSON.stringify({
        type: event.name,
        id: event.data.id,
      }),
    });
    console.info(
      `[product-updated] Revalidation triggered for event=${event.name} id=${event.data.id} status=${res.status}`,
    );
  } catch (err) {
    console.error("[product-updated] Failed to revalidate storefront:", err);
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.updated",
    "product.created",
    "product.deleted",
    "product-type.updated",
    "product-type.created",
    "product-type.deleted",
    "product-option.updated",
    "product-option.created",
    "product-option.deleted",
    "product-tag.updated",
    "product-tag.created",
    "product-tag.deleted",
    "product-variant.updated",
    "product-variant.created",
    "product-variant.deleted",
    "product-collection.updated",
    "product-collection.created",
    "product-collection.deleted",
    "product-category.updated",
    "product-category.created",
    "product-category.deleted",
    "translation.created",
    "translation.updated",
    "translation.deleted",
  ],
};

import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type { Logger } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  OrderShipmentCreatedEmail,
  type FulfillmentLabel,
} from "../emails/order-shipment-created";
import { STOREFRONT_URL } from "../emails/i18n";
import {
  findOrderForEmail,
  sendOrderEmail,
  suppressedByAdmin,
} from "../emails/lib/notify";

const TAG = "order-shipped-email";

/**
 * `shipment.created` is the event that actually means "shipped", and it is the
 * first point at which a tracking number exists. Its payload carries only the
 * fulfillment id, so the order is resolved through `fulfillments.id`.
 */
export default async function orderShipmentCreatedEmailHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger;

  const fulfillmentId = event.data?.id;
  if (!fulfillmentId) {
    logger.warn(`[${TAG}] Missing fulfillment id in event payload`);
    return;
  }

  if (suppressedByAdmin(container, TAG, event.data, fulfillmentId)) {
    return;
  }

  const order = await findOrderForEmail(
    container,
    { fulfillments: { id: fulfillmentId } },
    ["fulfillments.id", "fulfillments.labels.tracking_number", "fulfillments.labels.tracking_url"],
  );

  if (!order) {
    logger.warn(`[${TAG}] No order linked to fulfillment: ${fulfillmentId}`);
    return;
  }

  const fulfillments = (order.fulfillments ?? []) as Array<{
    id: string;
    labels?: FulfillmentLabel[];
  }>;
  const labels =
    fulfillments.find((f) => f.id === fulfillmentId)?.labels ?? [];

  await sendOrderEmail({
    container,
    tag: TAG,
    eventName: event.name,
    order,
    template: "order-shipped",
    idempotencyKey: `order-shipped:${order.id}:${fulfillmentId}`,
    Component: OrderShipmentCreatedEmail,
    props: { labels },
    subjectKey: "Shipment.subject",
    text: (t, id) => {
      const numbers = labels
        .map((label) => label.tracking_number)
        .filter(Boolean)
        .join(", ");

      return [
        t("Shipment.textFallback", { id }),
        numbers ? t("Shipment.textTracking", { numbers }) : "",
        "",
        t("Shipment.textDelivery"),
        "",
        `${STOREFRONT_URL}/account/orders`,
      ].join("\n");
    },
  });
}

export const config: SubscriberConfig = {
  event: "shipment.created",
};

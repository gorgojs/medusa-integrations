import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type { Logger } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { OrderDeliveredEmail } from "../emails/order-delivered";
import { STOREFRONT_URL } from "../emails/i18n";
import {
  findOrderForEmail,
  sendOrderEmail,
  suppressedByAdmin,
} from "../emails/lib/notify";

const TAG = "order-delivered-email";

/**
 * `delivery.created` fires when a fulfillment is marked as delivered. Like
 * `shipment.created`, it carries only the fulfillment id.
 */
export default async function orderDeliveredEmailHandler({
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

  const order = await findOrderForEmail(container, {
    fulfillments: { id: fulfillmentId },
  });

  if (!order) {
    logger.warn(`[${TAG}] No order linked to fulfillment: ${fulfillmentId}`);
    return;
  }

  await sendOrderEmail({
    container,
    tag: TAG,
    eventName: event.name,
    order,
    template: "order-delivered",
    idempotencyKey: `order-delivered:${order.id}:${fulfillmentId}`,
    Component: OrderDeliveredEmail,
    subjectKey: "Delivery.subject",
    text: (t, id) =>
      [
        t("Delivery.textFallback", { id }),
        "",
        t("Delivery.somethingWrong"),
        "",
        `${STOREFRONT_URL}/account/orders`,
      ].join("\n"),
  });
}

export const config: SubscriberConfig = {
  event: "delivery.created",
};

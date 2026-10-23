import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type { Logger } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { OrderFulfillmentCreatedEmail } from "../emails/order-fulfillment-created";
import { STOREFRONT_URL } from "../emails/i18n";
import {
  findOrderForEmail,
  sendOrderEmail,
  suppressedByAdmin,
} from "../emails/lib/notify";

const TAG = "order-packed-email";

/**
 * `order.fulfillment_created` fires when the order is packed, before the parcel
 * reaches a carrier. No tracking number exists yet, so this email only confirms
 * the order is on its way out. The tracking goes out on `shipment.created`.
 */
export default async function orderFulfillmentCreatedEmailHandler({
  event,
  container,
}: SubscriberArgs<{
  order_id: string;
  fulfillment_id: string;
  no_notification?: boolean;
}>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger;

  const orderId = event.data?.order_id;
  if (!orderId) {
    logger.warn(`[${TAG}] Missing order id in event payload`);
    return;
  }

  if (suppressedByAdmin(container, TAG, event.data, orderId)) {
    return;
  }

  const order = await findOrderForEmail(container, { id: orderId });
  if (!order) {
    logger.warn(`[${TAG}] Order not found: ${orderId}`);
    return;
  }

  await sendOrderEmail({
    container,
    tag: TAG,
    eventName: event.name,
    order,
    template: "order-packed",
    idempotencyKey: `order-packed:${order.id}:${event.data.fulfillment_id ?? "nofulfillment"}`,
    Component: OrderFulfillmentCreatedEmail,
    subjectKey: "Fulfillment.subject",
    text: (t, id) =>
      [
        t("Fulfillment.textFallback", { id }),
        "",
        t("Fulfillment.nextStep"),
        "",
        `${STOREFRONT_URL}/account/orders`,
      ].join("\n"),
  });
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
};

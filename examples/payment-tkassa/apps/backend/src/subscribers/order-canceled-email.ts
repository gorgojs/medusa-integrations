import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type { Logger } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { OrderCanceledEmail } from "../emails/order-canceled";
import { STOREFRONT_URL } from "../emails/i18n";
import { findOrderForEmail, sendOrderEmail } from "../emails/lib/notify";

const TAG = "order-canceled-email";

/** `order.canceled` puts the order id under `id`, not `order_id`. */
export default async function orderCanceledEmailHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger;

  const orderId = event.data?.id;
  if (!orderId) {
    logger.warn(`[${TAG}] Missing order id in event payload`);
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
    template: "order-canceled",
    idempotencyKey: `order-canceled:${order.id}`,
    Component: OrderCanceledEmail,
    subjectKey: "OrderCanceled.subject",
    text: (t, id) =>
      [
        t("OrderCanceled.textFallback", { id }),
        "",
        t("OrderCanceled.refundNote"),
        "",
        STOREFRONT_URL,
      ].join("\n"),
  });
}

export const config: SubscriberConfig = {
  event: "order.canceled",
};

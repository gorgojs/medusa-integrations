import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type {
  INotificationModuleService,
  Logger,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { render } from "@react-email/render";
import { createElement } from "react";
import { OrderPlacedEmail } from "../emails/order-placed";
import {
  getEmailTranslator,
  getLocaleFromMetadata,
  resolveEmailLocale,
  STOREFRONT_URL,
} from "../emails/i18n";

export default async function orderPlacedEmailHandler({
  event,
  container,
}: SubscriberArgs<{ id?: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger;

  const orderId = event.data.id;
  if (!orderId) {
    logger.warn("[order-placed-email] Missing order id in event payload");
    return;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const notificationService = container.resolve(
    Modules.NOTIFICATION,
  ) as INotificationModuleService;

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "customer_id",
      "currency_code",
      "total",
      "shipping_total",
      "locale",
      "customer.metadata",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.address_1",
      "shipping_address.city",
      "shipping_address.country_code",
      "items.*",
    ],
    filters: { id: orderId },
  });

  if (!orders.length) {
    logger.warn(`[order-placed-email] Order not found: ${orderId}`);
    return;
  }

  const order = orders[0] as any;

  if (!order.email) {
    logger.warn(`[order-placed-email] No email on order ${orderId}, skipping`);
    return;
  }

  const locale = resolveEmailLocale(
    order.locale,
    getLocaleFromMetadata(order.customer?.metadata),
  );
  const { t } = getEmailTranslator(locale);
  const id = order.display_id ?? order.id;

  const html = await render(createElement(OrderPlacedEmail, { order, locale }));
  const text = [
    t("OrderPlaced.textFallback", { id }),
    "",
    t("OrderPlaced.watchStatus"),
    "",
    `${STOREFRONT_URL}/account/orders`,
  ].join("\n");

  try {
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-placed",
      trigger_type: event.name,
      resource_id: order.id,
      resource_type: "order",
      receiver_id: order.customer_id || undefined,
      idempotency_key: `order-placed:${order.id}`,
      content: {
        subject: t("OrderPlaced.subject", { id }),
        html,
        text,
      },
    } as any);

    logger.info(
      `[order-placed-email] Sent to ${order.email} for order ${order.id} (locale: ${locale})`,
    );
  } catch (err: any) {
    logger.error(
      `[order-placed-email] Failed to send notification: ${err?.message}`,
    );
  }
}

export const config: SubscriberConfig = {
  event: ["order.placed"],
};

import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type {
  INotificationModuleService,
  Logger,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { render } from "@react-email/render";
import { createElement } from "react";
import { OrderCompletedEmail } from "../emails/order-completed";
import {
  getEmailTranslator,
  getLocaleFromMetadata,
  resolveEmailLocale,
  STOREFRONT_URL,
} from "../emails/i18n";

export default async function orderCompletedEmailHandler({
  event,
  container,
}: SubscriberArgs<{ id?: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger;

  const orderId = event.data.id;
  if (!orderId) {
    logger.warn("[order-completed-email] Missing order id in event payload");
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
      "shipping_address.city",
      "shipping_address.country_code",
      "items.*",
    ],
    filters: { id: orderId },
  });

  if (!orders.length) {
    logger.warn(`[order-completed-email] Order not found: ${orderId}`);
    return;
  }

  const order = orders[0] as any;

  if (!order.email) {
    logger.warn(
      `[order-completed-email] No email on order ${orderId}, skipping`,
    );
    return;
  }

  const locale = resolveEmailLocale(
    order.locale,
    getLocaleFromMetadata(order.customer?.metadata),
  );
  const { t } = getEmailTranslator(locale);
  const id = order.display_id ?? order.id;

  const html = await render(
    createElement(OrderCompletedEmail, { order, locale }),
  );
  const text = [
    t("OrderCompleted.textFallback", { id }),
    "",
    `${STOREFRONT_URL}/account/orders`,
  ].join("\n");

  try {
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-completed",
      trigger_type: event.name,
      resource_id: order.id,
      resource_type: "order",
      receiver_id: order.customer_id || undefined,
      idempotency_key: `order-completed:${order.id}`,
      content: {
        subject: t("OrderCompleted.subject", { id }),
        html,
        text,
      },
    } as any);

    logger.info(
      `[order-completed-email] Sent to ${order.email} for order ${order.id} (locale: ${locale})`,
    );
  } catch (err: any) {
    logger.error(
      `[order-completed-email] Failed to send notification: ${err?.message}`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "order.completed",
};

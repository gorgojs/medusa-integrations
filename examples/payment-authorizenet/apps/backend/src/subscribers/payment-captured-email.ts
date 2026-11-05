import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type {
  INotificationModuleService,
  Logger,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { render } from "@react-email/render";
import { createElement } from "react";
import { PaymentCapturedEmail } from "../emails/payment-captured";
import {
  getEmailTranslator,
  getLocaleFromMetadata,
  resolveEmailLocale,
  STOREFRONT_URL,
} from "../emails/i18n";

export default async function orderPaidEmailHandler({
  event,
  container,
}: SubscriberArgs<{ id?: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger;

  const paymentId = event.data?.id;
  if (!paymentId) {
    logger.warn("[order-paid-email] Missing payment id in event payload");
    return;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const notificationService = container.resolve(
    Modules.NOTIFICATION,
  ) as INotificationModuleService;

  const { data: payments } = await query.graph({
    entity: "payment",
    fields: [
      "id",
      "payment_collection.order.*",
      "payment_collection.order.items.*",
      "payment_collection.order.shipping_address.*",
      "payment_collection.order.customer.*",
    ],
    filters: { id: paymentId },
  });

  if (!payments.length) {
    logger.warn(`[order-paid-email] Payment not found: ${paymentId}`);
    return;
  }

  const order = (payments[0] as any).payment_collection?.order;

  if (!order) {
    logger.warn(`[order-paid-email] No order linked to payment: ${paymentId}`);
    return;
  }

  if (!order.email) {
    logger.warn(`[order-paid-email] No email on order ${order.id}, skipping`);
    return;
  }

  const locale = resolveEmailLocale(
    order.locale,
    getLocaleFromMetadata(order.customer?.metadata),
  );
  const { t } = getEmailTranslator(locale);
  const id = order.display_id ?? order.id;

  const html = await render(
    createElement(PaymentCapturedEmail, { order, locale }),
  );
  const text = [
    t("Payment.textFallback", { id }),
    "",
    `${STOREFRONT_URL}/account/orders`,
  ].join("\n");

  try {
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-paid",
      trigger_type: event.name,
      resource_id: order.id,
      resource_type: "order",
      receiver_id: order.customer_id || undefined,
      idempotency_key: `order-paid:${order.id}`,
      content: {
        subject: t("Payment.subject", { id }),
        html,
        text,
      },
    } as any);

    logger.info(
      `[order-paid-email] Sent to ${order.email} for order ${order.id} (locale: ${locale})`,
    );
  } catch (err: any) {
    logger.error(
      `[order-paid-email] Failed to send notification: ${err?.message}`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "payment.captured",
};

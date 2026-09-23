import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type {
  INotificationModuleService,
  Logger,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { render } from "@react-email/render";
import { createElement } from "react";
import { WelcomeEmail } from "../emails/welcome";
import {
  getEmailTranslator,
  getLocaleFromMetadata,
  resolveEmailLocale,
  STOREFRONT_URL,
} from "../emails/i18n";

export default async function customerCreatedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string } | { id: string }[]>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger;

  const payload = event.data;
  const ids = (Array.isArray(payload) ? payload : [payload])
    .map((entry) => entry?.id)
    .filter(Boolean);

  if (!ids.length) {
    logger.warn("[customer-created] No customer id in event payload");
    return;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const notificationService = container.resolve(
    Modules.NOTIFICATION,
  ) as INotificationModuleService;

  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "first_name", "has_account", "metadata"],
    filters: { id: ids },
  });

  const shopUrl = `${STOREFRONT_URL}/store`;

  for (const customer of customers) {
    if (!customer.has_account) {
      continue;
    }

    if (!customer.email) {
      logger.warn(
        `[customer-created] No email for customer ${customer.id}, skipping`,
      );
      continue;
    }

    const locale = resolveEmailLocale(
      getLocaleFromMetadata(customer.metadata),
    );
    const { t } = getEmailTranslator(locale);

    const html = await render(
      createElement(WelcomeEmail, {
        firstName: customer.first_name,
        shopUrl,
        locale,
      }),
    );
    const text = [
    t("Welcome.textFallback", { url: shopUrl }),
    "",
    `${t("Welcome.claimOrders")} ${STOREFRONT_URL}/account/orders`,
  ].join("\n");

    try {
      await notificationService.createNotifications({
        to: customer.email,
        channel: "email",
        template: "welcome",
        trigger_type: event.name,
        resource_id: customer.id,
        resource_type: "customer",
        receiver_id: customer.id,
        idempotency_key: `welcome:${customer.id}`,
        content: {
          subject: t("Welcome.subject"),
          html,
          text,
        },
      } as any);

      logger.info(
        `[customer-created] Welcome email sent to ${customer.email} (locale: ${locale})`,
      );
    } catch (err: any) {
      logger.error(
        `[customer-created] Failed to send welcome email: ${err?.message}`,
      );
    }
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
};

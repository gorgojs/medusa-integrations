import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type {
  INotificationModuleService,
  Logger,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { render } from "@react-email/render";
import { createElement } from "react";
import { PasswordResetEmail } from "../emails/password-reset";
import {
  getEmailTranslator,
  getLocaleFromMetadata,
  resolveEmailLocale,
  STOREFRONT_URL,
} from "../emails/i18n";

export default async function passwordResetEmailHandler({
  event,
  container,
}: SubscriberArgs<{
  entity_id: string;
  token: string;
  actor_type: string;
  metadata?: Record<string, unknown>;
}>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger;

  const { entity_id: email, token, actor_type, metadata } = event.data;

  if (actor_type !== "customer") {
    return;
  }

  if (!email || !token) {
    logger.warn(
      "[password-reset-email] Missing email or token in event payload",
    );
    return;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const notificationService = container.resolve(
    Modules.NOTIFICATION,
  ) as INotificationModuleService;

  let storedLocale: string | undefined;

  try {
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "metadata"],
      filters: { email },
    });
    storedLocale = getLocaleFromMetadata((customers[0] as any)?.metadata);
  } catch {}

  const locale = resolveEmailLocale(
    getLocaleFromMetadata(metadata),
    storedLocale,
  );
  const { t } = getEmailTranslator(locale);

  const resetUrl = `${STOREFRONT_URL}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  const html = await render(
    createElement(PasswordResetEmail, { email, token, resetUrl, locale }),
  );

  const text = t("PasswordReset.textFallback", { url: resetUrl });

  try {
    await notificationService.createNotifications({
      to: email,
      channel: "email",
      template: "password-reset",
      trigger_type: event.name,
      resource_id: email,
      resource_type: "customer",
      idempotency_key: `password-reset:${email}:${token}`,
      content: {
        subject: t("PasswordReset.subject"),
        html,
        text,
      },
    } as any);

    logger.info(`[password-reset-email] Sent to ${email} (locale: ${locale})`);
  } catch (err: any) {
    logger.error(
      `[password-reset-email] Failed to send notification: ${err?.message}`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
};

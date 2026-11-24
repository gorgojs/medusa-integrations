import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type {
  ConfigModule,
  IAuthModuleService,
  ICacheService,
  INotificationModuleService,
  Logger,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { render } from "react-email";
import { createElement } from "react";
import { EmailVerificationEmail } from "../emails/email-verification";
import {
  getEmailTranslator,
  getLocaleFromMetadata,
  resolveEmailLocale,
  STOREFRONT_URL,
} from "../emails/i18n";

// At most this many links per address in an hour. Medusa voids the previous
// link with every request, so each email has to go out to stay usable, and the
// cap is what keeps the route from mailing one address without end.
const MAX_EMAILS_PER_HOUR = 5;

/**
 * Sends the link a customer follows to confirm their email.
 *
 * `POST /auth/verification/request` accepts any auth token and any address,
 * and emits this event whatever medusa-config.ts says. So the handler checks
 * for itself, before anything leaves the store's mailbox, that:
 * - customer email verification is on (`CUSTOMER_EMAIL_VERIFICATION=true`)
 * - the address is the emailpass identity of the auth identity that asked
 * - the address has had fewer than five links this hour
 *
 * The payload carries no actor type, so the storefront tags its own requests
 * with `metadata.actor_type`. A verification requested for an Admin user needs
 * a link into the Admin rather than the storefront, and is left alone here.
 */
export default async function emailVerificationHandler({
  event,
  container,
}: SubscriberArgs<{
  entity_id: string;
  entity_type: string;
  code: string;
  auth_identity_id?: string;
  metadata?: Record<string, unknown>;
}>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger;

  const {
    entity_id: email,
    entity_type,
    code,
    auth_identity_id: authIdentityId,
    metadata,
  } = event.data;

  if (entity_type !== "email" || metadata?.actor_type !== "customer") {
    return;
  }

  if (!email || !code || !authIdentityId) {
    logger.warn(
      "[email-verification-email] Missing email, code or auth identity in event payload",
    );
    return;
  }

  const config = container.resolve(
    ContainerRegistrationKeys.CONFIG_MODULE,
  ) as ConfigModule;
  const required =
    config.projectConfig.http.authVerificationsPerActor?.customer?.some(
      (rule) => rule.auth_provider === "emailpass" && rule.entity_type === "email",
    ) ?? false;

  if (!required) {
    logger.warn(
      `[email-verification-email] Ignored a request for ${email}: customer email verification is off`,
    );
    return;
  }

  const authModule = container.resolve(Modules.AUTH) as IAuthModuleService;
  const identity = await authModule
    .retrieveAuthIdentity(authIdentityId, {
      relations: ["provider_identities"],
    })
    .catch(() => null);
  const ownsAddress = identity?.provider_identities?.some(
    (provider) =>
      provider.provider === "emailpass" && provider.entity_id === email,
  );

  if (!ownsAddress) {
    logger.warn(
      `[email-verification-email] Ignored a request for ${email}: it is not the requester's emailpass address`,
    );
    return;
  }

  const cache = container.resolve(Modules.CACHE) as ICacheService;
  const hour = Math.floor(Date.now() / 3_600_000);
  const countKey = `email-verification:sent:${email.toLowerCase()}:${hour}`;
  const sent = (await cache.get<number>(countKey)) ?? 0;

  if (sent >= MAX_EMAILS_PER_HOUR) {
    logger.warn(
      `[email-verification-email] Skipped ${email}: ${sent} links went out this hour`,
    );
    return;
  }
  await cache.set(countKey, sent + 1, 3600);

  const notificationService = container.resolve(
    Modules.NOTIFICATION,
  ) as INotificationModuleService;

  const locale = resolveEmailLocale(getLocaleFromMetadata(metadata));
  const { t } = getEmailTranslator(locale);

  const verifyUrl = `${STOREFRONT_URL}/${locale}/verify-account?token=${encodeURIComponent(code)}`;

  const html = await render(
    createElement(EmailVerificationEmail, { email, verifyUrl, locale }),
  );

  const text = t("EmailVerification.textFallback", { url: verifyUrl });

  try {
    await notificationService.createNotifications({
      to: email,
      channel: "email",
      template: "email-verification",
      trigger_type: event.name,
      resource_id: email,
      resource_type: "customer",
      idempotency_key: `email-verification:${email}:${code}`,
      content: {
        subject: t("EmailVerification.subject"),
        html,
        text,
      },
    } as any);

    logger.info(
      `[email-verification-email] Sent to ${email} (locale: ${locale})`,
    );
  } catch (err: any) {
    logger.error(
      `[email-verification-email] Failed to send notification: ${err?.message}`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "auth.verification_requested",
};

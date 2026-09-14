import type { MedusaContainer } from "@medusajs/framework";
import type {
  INotificationModuleService,
  Logger,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { render } from "@react-email/render";
import { createElement, type ComponentType } from "react";
import {
  type EmailLocale,
  type EmailTranslator,
  getEmailTranslator,
  getLocaleFromMetadata,
  resolveEmailLocale,
} from "../i18n";

/**
 * Shared plumbing for the order emails. Each subscriber differs only in which
 * order it looks up, which template it renders and what the plain-text part
 * says, so everything around that lives here once.
 */

/** The fields every order template reads, plus what locale resolution needs. */
export const ORDER_EMAIL_FIELDS = [
  "id",
  "display_id",
  "email",
  "customer_id",
  "currency_code",
  "locale",
  "customer.metadata",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.address_1",
  "shipping_address.city",
  "shipping_address.country_code",
];

export type OrderForEmail = {
  id: string;
  display_id?: number | string;
  email?: string;
  customer_id?: string | null;
  locale?: string | null;
  customer?: { metadata?: Record<string, unknown> | null } | null;
  [key: string]: unknown;
};

/**
 * Looks an order up by whatever the event gave us. `shipment.created` and
 * `delivery.created` carry only a fulfillment id, so they filter on
 * `fulfillments.id` instead of the order's own.
 */
export async function findOrderForEmail(
  container: MedusaContainer,
  filters: Record<string, unknown>,
  extraFields: string[] = [],
): Promise<OrderForEmail | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [...ORDER_EMAIL_FIELDS, ...extraFields],
    filters,
  });

  return (orders[0] as OrderForEmail | undefined) ?? null;
}

type SendOrderEmailOptions<P> = {
  container: MedusaContainer;
  /** Prefixes every log line, for example `order-shipped-email` */
  tag: string;
  /** The event name, stored on the notification as `trigger_type` */
  eventName: string;
  order: OrderForEmail;
  /** Notification template id, for example `order-shipped` */
  template: string;
  /** Makes repeated deliveries of the same event a no-op */
  idempotencyKey: string;
  Component: ComponentType<P>;
  /** Everything the template needs besides `order` and `locale` */
  props?: Omit<P, "order" | "locale">;
  /** Message key holding the subject line, for example `Shipment.subject` */
  subjectKey: string;
  /** Builds the plain-text alternative, given the resolved translator */
  text: (t: EmailTranslator["t"], id: string | number) => string;
};

/**
 * Renders a template and hands it to the Notification Module. Returns whether
 * anything was sent, so a caller can log its own reason for skipping.
 */
export async function sendOrderEmail<P extends object>({
  container,
  tag,
  eventName,
  order,
  template,
  idempotencyKey,
  Component,
  props,
  subjectKey,
  text,
}: SendOrderEmailOptions<P>): Promise<boolean> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger;
  const notificationService = container.resolve(
    Modules.NOTIFICATION,
  ) as INotificationModuleService;

  if (!order.email) {
    logger.warn(`[${tag}] No email on order ${order.id}, skipping`);
    return false;
  }

  const locale: EmailLocale = resolveEmailLocale(
    order.locale,
    getLocaleFromMetadata(order.customer?.metadata),
  );
  const { t } = getEmailTranslator(locale);
  const id = order.display_id ?? order.id;

  const html = await render(
    createElement(Component, { ...(props ?? {}), order, locale } as P),
  );

  try {
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template,
      trigger_type: eventName,
      resource_id: order.id,
      resource_type: "order",
      receiver_id: order.customer_id || undefined,
      idempotency_key: idempotencyKey,
      content: {
        subject: t(subjectKey, { id }),
        html,
        text: text(t, id),
      },
    } as Parameters<INotificationModuleService["createNotifications"]>[0]);

    logger.info(
      `[${tag}] Sent to ${order.email} for order ${order.id} (locale: ${locale})`,
    );
    return true;
  } catch (err) {
    logger.error(
      `[${tag}] Failed to send notification: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return false;
  }
}

/**
 * The Admin offers a "do not notify the customer" checkbox on every fulfillment
 * action, and Medusa forwards it on the event as `no_notification`. Only the
 * fulfillment family carries the flag; `order.placed` and `order.completed`
 * have nothing to check.
 */
export function suppressedByAdmin(
  container: MedusaContainer,
  tag: string,
  data: { no_notification?: boolean } | undefined,
  orderId: string,
): boolean {
  if (!data?.no_notification) {
    return false;
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as Logger;
  logger.info(
    `[${tag}] Suppressed for order ${orderId}: the Admin asked not to notify the customer`,
  );
  return true;
}

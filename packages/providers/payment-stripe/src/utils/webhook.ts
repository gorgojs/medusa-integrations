import { PaymentActions } from "@medusajs/framework/utils"

type IntentAmountField = "amount" | "amount_capturable" | "amount_received"

/**
 * What each PaymentIntent event means for Medusa, and which amount it carries. Medusa acts on
 * `authorized` and `captured` only: they complete a cart the storefront left before placing the
 * order. The others are returned so the event is logged with its meaning.
 */
export const WEBHOOK_ACTIONS: Record<string, { action: PaymentActions; amount: IntentAmountField }> = {
  "payment_intent.amount_capturable_updated": { action: PaymentActions.AUTHORIZED, amount: "amount_capturable" },
  "payment_intent.succeeded": { action: PaymentActions.SUCCESSFUL, amount: "amount_received" },
  "payment_intent.payment_failed": { action: PaymentActions.FAILED, amount: "amount" },
  "payment_intent.canceled": { action: PaymentActions.CANCELED, amount: "amount" },
  "payment_intent.processing": { action: PaymentActions.PENDING, amount: "amount" },
  "payment_intent.requires_action": { action: PaymentActions.REQUIRES_MORE, amount: "amount" },
  "payment_intent.partially_funded": { action: PaymentActions.REQUIRES_MORE, amount: "amount" },
}

/** The events a webhook endpoint has to send for Medusa to complete carts the storefront left. */
export const REQUIRED_WEBHOOK_EVENTS = Object.entries(WEBHOOK_ACTIONS)
  .filter(([, { action }]) => action === PaymentActions.AUTHORIZED || action === PaymentActions.SUCCESSFUL)
  .map(([event]) => event)

/** Events about money moved in the Stripe Dashboard, which Medusa does not record. */
export const UNRECORDED_WEBHOOK_EVENTS = new Set(["charge.refunded", "refund.failed", "charge.dispute.created"])

/** The path of Medusa's webhook route for a Stripe provider, without the provider id. */
export const WEBHOOK_PATH_PREFIX = "/hooks/payment/stripe_"

/**
 * The request body exactly as Stripe sent it, which the signature is computed over. Medusa's route
 * passes `req.rawBody`, and the event bus that delivers it to the subscriber serializes a Buffer as
 * `{ type: "Buffer", data: [...] }`, so all three shapes arrive here.
 */
export function readRawBody(rawData: unknown): Buffer | string | null {
  if (typeof rawData === "string" || Buffer.isBuffer(rawData)) {
    return rawData.length ? rawData : null
  }
  const serialized = rawData as { type?: unknown; data?: unknown } | null | undefined
  if (serialized?.type === "Buffer" && Array.isArray(serialized.data)) {
    return Buffer.from(serialized.data as number[])
  }
  return null
}

/** The `Stripe-Signature` header, whatever case and shape the framework delivered it in. */
export function readSignature(headers: Record<string, unknown> | undefined): string | null {
  const entry = Object.entries(headers ?? {}).find(([name]) => name.toLowerCase() === "stripe-signature")
  const value = Array.isArray(entry?.[1]) ? entry?.[1][0] : entry?.[1]
  return typeof value === "string" && value ? value : null
}

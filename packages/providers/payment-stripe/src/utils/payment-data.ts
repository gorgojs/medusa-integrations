import type Stripe from "stripe"

export type StripeRefundRecord = {
  id: string
  status?: string | null
  /** Minor units, as Stripe reports it. */
  amount: number
}

/**
 * What the provider keeps in a Medusa payment session and payment. Medusa merges it with the data
 * the storefront sent, so `session_id` is there too.
 *
 * Medusa's core Stripe provider stored the whole PaymentIntent. Its `id`, `amount` and `currency`
 * have the same names here, so a payment created by the core provider is captured, refunded and
 * canceled by this one.
 */
export type StripeSessionData = {
  session_id?: string
  /** The PaymentIntent id. */
  id?: string
  /** Only on a session: the storefront confirms the PaymentIntent with it. */
  client_secret?: string | null
  status?: string
  /** Minor units. */
  amount?: number
  amount_received?: number
  currency?: string
  capture_method?: string
  payment_method_type?: string
  card_brand?: string
  card_last4?: string
  wallet?: string
  refunds?: StripeRefundRecord[]
}

function withoutEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== "")) as T
}

function cardOf(intent: Stripe.PaymentIntent) {
  const method = typeof intent.payment_method === "object" ? intent.payment_method : null
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null
  const card = method?.card ?? charge?.payment_method_details?.card ?? null
  return {
    type: method?.type ?? charge?.payment_method_details?.type,
    brand: card?.brand ?? undefined,
    last4: card?.last4 ?? undefined,
    wallet: card?.wallet?.type ?? undefined,
  }
}

/**
 * The session data for a PaymentIntent. `client_secret` is kept only while the storefront still has
 * to confirm the payment: a payment that lives on after authorization has no use for it.
 */
export function toSessionData(
  intent: Stripe.PaymentIntent,
  previous: StripeSessionData = {},
  { keepClientSecret = false }: { keepClientSecret?: boolean } = {}
): StripeSessionData {
  const card = cardOf(intent)
  const merged: StripeSessionData = {
    ...previous,
    id: intent.id,
    client_secret: keepClientSecret ? intent.client_secret ?? undefined : undefined,
    status: intent.status,
    amount: intent.amount,
    amount_received: intent.amount_received || undefined,
    currency: intent.currency,
    capture_method: intent.capture_method,
    payment_method_type: card.type ?? previous.payment_method_type,
    card_brand: card.brand ?? previous.card_brand,
    card_last4: card.last4 ?? previous.card_last4,
    wallet: card.wallet ?? previous.wallet,
  }
  if (!keepClientSecret) {
    delete merged.client_secret
  }
  return withoutEmpty(merged)
}

/**
 * Session data in this provider's shape. Data written by Medusa's core provider is the whole
 * PaymentIntent, with its client secret and the expanded payment method; it is reduced to the
 * fields above, so a migrated payment stops carrying them the first time this provider touches it.
 */
export function normalizeSessionData(data: Record<string, unknown> | undefined): StripeSessionData {
  if (data?.object === "payment_intent") {
    const sessionId = typeof data.session_id === "string" ? data.session_id : undefined
    return toSessionData(data as unknown as Stripe.PaymentIntent, withoutEmpty({ session_id: sessionId }))
  }
  return (data ?? {}) as StripeSessionData
}

/** Keys that carry a secret or the buyer's details, and that this provider never keeps. */
const SCRUBBED_KEYS = ["client_secret", "payment_method", "latest_charge"] as const

/**
 * Clears the keys the stored data had and the new data drops. Medusa merges a provider's data into
 * the stored object (`assign` with `mergeObjectProperties`), so a key left out stays in the database:
 * it has to be overwritten with `null` to go. This is how a session's client secret goes once the
 * payment is settled, and how a payment created by the core provider loses its expanded payment
 * method with the buyer's billing details.
 */
export function scrubbed(data: StripeSessionData, stored: Record<string, unknown> | undefined): StripeSessionData {
  const cleared = SCRUBBED_KEYS.filter((key) => stored?.[key] != null && (data as Record<string, unknown>)[key] == null)
  return cleared.length ? { ...data, ...Object.fromEntries(cleared.map((key) => [key, null])) } : data
}

/**
 * The PaymentIntent id in session data written by this provider or by Medusa's core provider, which
 * stored the whole PaymentIntent under the same `id`.
 */
export function readIntentId(data: Record<string, unknown> | undefined): string | undefined {
  const id = data?.id
  return typeof id === "string" && id.startsWith("pi_") ? id : undefined
}

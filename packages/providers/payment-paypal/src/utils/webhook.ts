import { PaymentActions } from "@medusajs/framework/utils"

/** The part of a PayPal webhook event the provider reads. */
export type PayPalWebhookEvent = {
  id?: string
  event_type?: string
  resource_type?: string
  resource?: {
    id?: string
    status?: string
    custom_id?: string
    amount?: { currency_code?: string; value?: string }
    supplementary_data?: { related_ids?: { order_id?: string } }
  }
}

/**
 * PayPal event → Medusa webhook action. Only `authorized` and `captured` move a payment in Medusa;
 * the others are logged with their meaning, the core subscriber skips them. Refunds and reversals
 * are not here: a refund of part of a capture is no cancellation, see UNRECORDED_WEBHOOK_EVENTS.
 */
export const WEBHOOK_ACTIONS: Record<string, PaymentActions> = {
  "PAYMENT.AUTHORIZATION.CREATED": PaymentActions.AUTHORIZED,
  "PAYMENT.CAPTURE.COMPLETED": PaymentActions.SUCCESSFUL,
  "PAYMENT.CAPTURE.DECLINED": PaymentActions.FAILED,
  // Payments v1 accounts send DENIED instead of DECLINED
  "PAYMENT.CAPTURE.DENIED": PaymentActions.FAILED,
  "PAYMENT.CAPTURE.PENDING": PaymentActions.PENDING,
  "PAYMENT.AUTHORIZATION.VOIDED": PaymentActions.CANCELED,
}

/**
 * Money returned after a capture: a refund, or a reversal after a dispute. No Medusa action fits, so
 * the provider answers `not_supported` and logs that Medusa does not record it.
 */
export const UNRECORDED_WEBHOOK_EVENTS = new Set(["PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED"])

/** The events a webhook must listen to for Medusa to act on PayPal payments. */
export const REQUIRED_WEBHOOK_EVENTS = Object.keys(WEBHOOK_ACTIONS).filter((name) =>
  [PaymentActions.AUTHORIZED, PaymentActions.SUCCESSFUL].includes(WEBHOOK_ACTIONS[name])
)

/** Hosts PayPal serves its signing certificates from. */
const CERT_HOSTS = new Set(["api.paypal.com", "api-m.paypal.com", "api.sandbox.paypal.com", "api-m.sandbox.paypal.com"])

export type PayPalTransmission = {
  auth_algo: string
  cert_url: string
  transmission_id: string
  transmission_sig: string
  transmission_time: string
}

const TRANSMISSION_HEADERS: Record<keyof PayPalTransmission, string> = {
  auth_algo: "paypal-auth-algo",
  cert_url: "paypal-cert-url",
  transmission_id: "paypal-transmission-id",
  transmission_sig: "paypal-transmission-sig",
  transmission_time: "paypal-transmission-time",
}

/** The signature headers of a PayPal delivery, or null when any of them is missing. */
export function readTransmission(headers: Record<string, unknown> | undefined): PayPalTransmission | null {
  const lowered = Object.fromEntries(Object.entries(headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]))
  const transmission = {} as PayPalTransmission
  for (const [field, header] of Object.entries(TRANSMISSION_HEADERS) as [keyof PayPalTransmission, string][]) {
    const value = lowered[header]
    const text = Array.isArray(value) ? value[0] : value
    if (typeof text !== "string" || !text) {
      return null
    }
    transmission[field] = text
  }
  return transmission
}

export function isPayPalCertUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.port === "" && CERT_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

/**
 * The body exactly as PayPal sent it, with the event parsed from it. `rawData` is a Buffer from
 * Medusa's hooks route, or a string. Null when it is missing or not a JSON object.
 */
export function readWebhookBody(rawData: unknown): { raw: string; event: PayPalWebhookEvent } | null {
  const raw = Buffer.isBuffer(rawData) ? rawData.toString("utf8") : typeof rawData === "string" ? rawData : ""
  if (!raw) {
    return null
  }
  try {
    const event = JSON.parse(raw)
    return event && typeof event === "object" && !Array.isArray(event) ? { raw, event } : null
  } catch {
    return null
  }
}

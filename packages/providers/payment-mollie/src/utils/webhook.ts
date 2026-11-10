import { PAYMENT_ID_PATTERN } from "./payment-data"

/**
 * The request body as Mollie sent it. Medusa's route passes `req.rawBody`, and the event bus that
 * delivers it to the subscriber serializes a Buffer as `{ type: "Buffer", data: [...] }`, so all
 * three shapes arrive here.
 */
export function readRawBody(rawData: unknown): string | null {
  if (typeof rawData === "string") {
    return rawData.length ? rawData : null
  }
  if (Buffer.isBuffer(rawData)) {
    return rawData.length ? rawData.toString("utf8") : null
  }
  const serialized = rawData as { type?: unknown; data?: unknown } | null | undefined
  if (serialized?.type === "Buffer" && Array.isArray(serialized.data)) {
    return Buffer.from(serialized.data as number[]).toString("utf8")
  }
  return null
}

/**
 * The payment id of a classic Mollie webhook, `id=tr_…` in a form body (docs: "Webhooks"). Medusa's
 * body parser has already read the form into `data`; the raw body is the fallback. Anything that is
 * not a payment id gives `null`, so a forged body never reaches a Mollie URL.
 */
export function readWebhookPaymentId(payload: { data?: unknown; rawData?: unknown } | undefined): string | null {
  const parsed = (payload?.data as Record<string, unknown> | undefined)?.id
  if (typeof parsed === "string") {
    return PAYMENT_ID_PATTERN.test(parsed) ? parsed : null
  }
  const body = readRawBody(payload?.rawData)
  if (!body) {
    return null
  }
  const id = new URLSearchParams(body).get("id")
  return id && PAYMENT_ID_PATTERN.test(id) ? id : null
}

/** A Medusa payment session id, as this provider puts it in the payment's metadata. */
export function isSessionId(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("payses_")
}

/** The Medusa session a Mollie payment was created for, from its `metadata.session_id`. */
export function readMetadataSessionId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null
  }
  const sessionId = (metadata as Record<string, unknown>).session_id
  return isSessionId(sessionId) ? sessionId : null
}

/** The route Medusa gives a Mollie provider, `/hooks/payment/mollie_<id>`, up to the id. */
export const WEBHOOK_PATH_PREFIX = "/hooks/payment/mollie_"

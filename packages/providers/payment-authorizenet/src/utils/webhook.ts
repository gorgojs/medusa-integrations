import { createHmac, timingSafeEqual } from "node:crypto"
import { PaymentActions } from "@medusajs/framework/utils"

/**
 * What each Authorize.net payment event means for Medusa. Medusa acts on `authorized` and
 * `captured` only, and this provider authorizes synchronously, inside `cart.complete`, so only two
 * events need action:
 * - `fraud.approved`: a transaction the Fraud Detection Suite held is approved, and the order that
 *   waited without a payment gets it;
 * - `priorAuthCapture.created`: an authorization was captured in the Merchant Interface.
 *
 * `fraud.declined` is returned as `failed` so the event is logged with its meaning.
 */
export const WEBHOOK_ACTIONS: Record<string, PaymentActions> = {
  "net.authorize.payment.fraud.approved": PaymentActions.AUTHORIZED,
  "net.authorize.payment.priorAuthCapture.created": PaymentActions.SUCCESSFUL,
  "net.authorize.payment.fraud.declined": PaymentActions.FAILED,
}

/** The events a webhook has to send for the cases above. */
export const REQUIRED_WEBHOOK_EVENTS = Object.keys(WEBHOOK_ACTIONS)

/**
 * Refunds and voids, which Medusa does not record when they are made in the Merchant Interface. A
 * refund or void made from Medusa sends the same event, so these are logged, not acted on.
 */
export const UNRECORDED_WEBHOOK_EVENTS = new Set([
  "net.authorize.payment.refund.created",
  "net.authorize.payment.void.created",
])

/**
 * Events about the payment's own authorization, which `cart.complete` has already recorded.
 * Acting on them would call `authorizePayment` with the same token while the cart completes.
 */
export const SYNCHRONOUS_WEBHOOK_EVENTS = new Set([
  "net.authorize.payment.authorization.created",
  "net.authorize.payment.authcapture.created",
  "net.authorize.payment.fraud.held",
])

/** The path of Medusa's webhook route for an Authorize.net provider, without the provider id. */
export const WEBHOOK_PATH_PREFIX = "/hooks/payment/authorizenet_"

/** The `payload` of a payment event, as Authorize.net sends it. */
export type AnetWebhookPayload = {
  responseCode?: number
  merchantReferenceId?: string
  authCode?: string
  avsResponse?: string
  authAmount?: number | string
  entityName?: string
  /** The transaction id. */
  id?: string
}

export type AnetWebhookEvent = {
  notificationId?: string
  eventType?: string
  eventDate?: string
  webhookId?: string
  payload?: AnetWebhookPayload
}

/**
 * The request body exactly as Authorize.net sent it, which the signature is computed over. Medusa's
 * route passes `req.rawBody`, and the event bus that delivers it to the subscriber serializes a
 * Buffer as `{ type: "Buffer", data: [...] }`, so all three shapes arrive here.
 */
export function readRawBody(rawData: unknown): Buffer | null {
  if (typeof rawData === "string") {
    return rawData.length ? Buffer.from(rawData, "utf8") : null
  }
  if (Buffer.isBuffer(rawData)) {
    return rawData.length ? rawData : null
  }
  const serialized = rawData as { type?: unknown; data?: unknown } | null | undefined
  if (serialized?.type === "Buffer" && Array.isArray(serialized.data)) {
    return Buffer.from(serialized.data as number[])
  }
  return null
}

/** The `X-ANET-Signature` header, whatever case and shape the framework delivered it in. */
export function readSignature(headers: Record<string, unknown> | undefined): string | null {
  const entry = Object.entries(headers ?? {}).find(([name]) => name.toLowerCase() === "x-anet-signature")
  const value = Array.isArray(entry?.[1]) ? entry?.[1][0] : entry?.[1]
  return typeof value === "string" && value ? value : null
}

const HEX = /^[0-9a-f]+$/i

/**
 * Checks `X-ANET-Signature`: an HMAC-SHA512 of the raw body with the Signature Key, compared in
 * constant time. Authorize.net documents only that much. The `sha512=` prefix, the case of the hex
 * and whether the key is used as text or as the bytes its hex spells are known from forums only, and
 * they disagree, so the prefix is optional, the case is ignored and both forms of the key are tried.
 * Each form still needs the key, so accepting both lets nothing unsigned through.
 */
export function verifyAnetSignature(body: Buffer, header: string, signatureKey: string): boolean {
  const digest = header.trim().replace(/^sha512=/i, "")
  if (digest.length !== 128 || !HEX.test(digest)) {
    return false
  }
  const given = Buffer.from(digest, "hex")
  const keys = [Buffer.from(signatureKey, "utf8")]
  if (HEX.test(signatureKey) && signatureKey.length % 2 === 0) {
    keys.push(Buffer.from(signatureKey, "hex"))
  }
  return keys.some((key) => timingSafeEqual(createHmac("sha512", key).update(body).digest(), given))
}

/** The event in a verified body, or `null` for a body that is not one. */
export function parseWebhookEvent(body: Buffer): AnetWebhookEvent | null {
  try {
    const event = JSON.parse(body.toString("utf8").replace(/^\uFEFF/, "")) as AnetWebhookEvent
    return event && typeof event === "object" && typeof event.eventType === "string" ? event : null
  } catch {
    return null
  }
}

/** A Medusa payment session id, as this provider sends it in `refId`. */
export function isSessionId(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("payses_")
}

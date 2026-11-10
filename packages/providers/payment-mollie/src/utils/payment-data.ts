import type { PaymentResponse } from "mollie-api-typescript/models"
import { fromMollieAmount } from "./amounts"

export type MollieCaptureRecord = {
  /** Mollie's capture id, `cpt_…`. */
  id: string
  status?: string
  /** Medusa's capture id, sent as the capture's `Idempotency-Key`. */
  idempotency_key?: string
}

export type MollieRefundRecord = {
  /** Mollie's refund id, `re_…`. */
  id: string
  status?: string
  /** Major units. */
  amount: number
  /** Medusa's refund idempotency key, sent as the refund's `Idempotency-Key`. */
  idempotency_key?: string
}

/**
 * What the provider keeps in a Medusa payment session and payment. Medusa merges it with the data
 * the storefront sent, so `session_id`, `redirect_url` and `locale` are there too.
 *
 * `id` is always the payment, `tr_…`: a capture or a refund is added to its own list and never
 * takes its place (one community plugin wrote the refund over the payment, and every later call
 * went to the refund).
 */
export type MollieSessionData = {
  session_id?: string
  redirect_url?: string
  locale?: string
  id?: string
  /** The last Mollie status the provider saw. Statuses are always re-read before acting. */
  status?: string
  mode?: string
  /** Mollie's payment page. Gone once the payment is no longer open. */
  checkout_url?: string | null
  /** When an open payment expires, ISO 8601. */
  expires_at?: string | null
  /** Major units, as Mollie reports the payment. */
  amount?: number
  currency_code?: string
  capture_mode?: string | null
  method?: string | null
  card_brand?: string | null
  card_last4?: string | null
  failure_reason?: string | null
  captures?: MollieCaptureRecord[] | null
  refunds?: MollieRefundRecord[] | null
  /** When `release-authorization` was asked for. Mollie releases the hold asynchronously. */
  release_requested_at?: string | null
}

/** The keys a storefront may put in the session data. Everything else is dropped. */
export const SESSION_INPUT_KEYS = new Set(["session_id", "redirect_url", "locale"])

export const MAX_REDIRECT_URL_LENGTH = 2048
const MAX_LOCALE_LENGTH = 10

/** A Mollie payment id. Anything else never reaches a Mollie URL. */
export const PAYMENT_ID_PATTERN = /^tr_[A-Za-z0-9]+$/

/** An absolute `http(s)` URL the buyer comes back to, or `undefined`. */
export function readRedirectUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value || value.length > MAX_REDIRECT_URL_LENGTH) {
    return undefined
  }
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:" ? value : undefined
  } catch {
    return undefined
  }
}

export type SessionInput = {
  sessionId?: string
  redirectUrl?: string
  locale?: string
  /** Keys the storefront sent that this package does not take. */
  dropped: string[]
}

/** Reads what the storefront sent with the session, keeping only the keys this package takes. */
export function readSessionInput(data: Record<string, unknown> | undefined): SessionInput {
  const input = data ?? {}
  const locale = input.locale
  return {
    sessionId: typeof input.session_id === "string" ? input.session_id : undefined,
    redirectUrl: readRedirectUrl(input.redirect_url),
    locale: typeof locale === "string" && locale.length <= MAX_LOCALE_LENGTH ? locale : undefined,
    dropped: Object.keys(input).filter((key) => !SESSION_INPUT_KEYS.has(key)),
  }
}

/** The Mollie payment id kept in the data, if it is one. */
export function readPaymentId(data: Record<string, unknown> | undefined): string | undefined {
  const id = data?.id
  return typeof id === "string" && PAYMENT_ID_PATTERN.test(id) ? id : undefined
}

function last4(cardNumber: string | null | undefined): string | undefined {
  const digits = cardNumber?.replace(/\D/g, "").slice(-4)
  return digits && digits.length === 4 ? digits : undefined
}

/**
 * Data refreshed from a Mollie payment, keeping what the previous data had. A key the payment no
 * longer has is written as `null`: Medusa merges a provider's data into the stored object (`assign`
 * with `mergeObjectProperties`), so a key left out would stay in the database.
 */
export function toPaymentData(payment: PaymentResponse, previous: MollieSessionData = {}): MollieSessionData {
  const details = payment.details ?? undefined
  return {
    ...previous,
    id: payment.id,
    status: payment.status,
    mode: payment.mode,
    checkout_url: payment.links?.checkout?.href ?? null,
    expires_at: payment.expiresAt ?? null,
    amount: fromMollieAmount(payment.amount),
    currency_code: payment.amount.currency.toLowerCase(),
    capture_mode: payment.captureMode ?? null,
    method: payment.method ?? null,
    card_brand: details?.cardLabel ?? previous.card_brand ?? null,
    card_last4: last4(details?.cardNumber) ?? previous.card_last4 ?? null,
    failure_reason: details?.failureReason ?? null,
  }
}

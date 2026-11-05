import {
  ACCEPT_DATA_DESCRIPTOR,
  AnetOpaqueData,
  AnetTransactionDetails,
  AnetTransactionResponse,
  GOOGLE_PAY_DATA_DESCRIPTOR,
} from "../types"

export type AuthorizeNetRefundRecord = {
  /** The refund transaction; absent when the refund was made by voiding an unsettled payment. */
  transId?: string
  /** Major units. */
  amount: number
  voided?: boolean
  /** Medusa's refund idempotency key, sent as the refund's `refId`. */
  idempotency_key?: string
}

/**
 * What the provider keeps in a Medusa payment session and payment. Medusa merges it with the data
 * the storefront sent, so `session_id` is there too.
 *
 * The gateway's own fields keep the gateway's names (`transId`, `accountNumber`, `accountType`,
 * `authCode`). The vendor's `payment-authorizenet-medusa` stored the whole `transactionResponse`
 * under the same names, so a payment it created is captured, refunded and voided by this provider.
 */
export type AuthorizeNetSessionData = {
  session_id?: string
  /** Major units, as Medusa passed it when the session was created. */
  amount?: number
  currency_code?: string
  /** The one-time token from Accept.js or Google Pay. Written as `null` once it has been used. */
  opaque_data?: AnetOpaqueData | null
  /** The session was started by an express checkout button. */
  express?: boolean
  transId?: string
  /** The last `transactionStatus` the provider saw. Statuses are always re-read before acting. */
  transactionStatus?: string
  accountNumber?: string
  accountType?: string
  authCode?: string
  card_brand?: string
  card_last4?: string
  /** The Fraud Detection Suite held the transaction for review. */
  held?: boolean
  refunds?: AuthorizeNetRefundRecord[]
}

export const ALLOWED_DATA_DESCRIPTORS = new Set([ACCEPT_DATA_DESCRIPTOR, GOOGLE_PAY_DATA_DESCRIPTOR])

/** The longest token accepted from the storefront. An Accept.js nonce is about 600 characters. */
export const MAX_DATA_VALUE_LENGTH = 8192

/**
 * Reads a token the storefront sent, accepting only the descriptors this package handles. Returns
 * `undefined` for anything else, so a forged descriptor or an empty value never reaches the gateway.
 */
export function readOpaqueData(value: unknown): AnetOpaqueData | undefined {
  if (!value || typeof value !== "object") {
    return undefined
  }
  const { dataDescriptor, dataValue } = value as Record<string, unknown>
  if (
    typeof dataDescriptor !== "string" ||
    !ALLOWED_DATA_DESCRIPTORS.has(dataDescriptor) ||
    typeof dataValue !== "string" ||
    !dataValue.length ||
    dataValue.length > MAX_DATA_VALUE_LENGTH
  ) {
    return undefined
  }
  return { dataDescriptor, dataValue }
}

/** The transaction id in data written by this provider or by the vendor's plugin. */
export function readTransId(data: Record<string, unknown> | undefined): string | undefined {
  const id = data?.transId
  // a transaction made in Test Mode reports the id 0, which identifies nothing
  if (typeof id === "string" && id.length && id !== "0") {
    return id
  }
  if (typeof id === "number" && id > 0) {
    return String(id)
  }
  return undefined
}

const BRANDS: Record<string, string> = {
  visa: "visa",
  mastercard: "mastercard",
  americanexpress: "amex",
  discover: "discover",
  jcb: "jcb",
  dinersclub: "diners",
  chinaunionpay: "unionpay",
}

/** `card_brand` and `card_last4` as the starter's order page reads them, from the gateway's fields. */
export function cardFields(accountNumber?: string, accountType?: string): { card_brand?: string; card_last4?: string } {
  const last4 = accountNumber?.replace(/\D/g, "").slice(-4)
  const brand = accountType ? BRANDS[accountType.replace(/[\s_-]/g, "").toLowerCase()] : undefined
  return { card_brand: brand, card_last4: last4 && last4.length === 4 ? last4 : undefined }
}

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}

/** Data after a transaction the gateway answered, keeping what the previous data had. */
export function fromTransactionResponse(
  previous: AuthorizeNetSessionData,
  response: AnetTransactionResponse,
  extra: Partial<AuthorizeNetSessionData> = {}
): AuthorizeNetSessionData {
  const card = cardFields(response.accountNumber, response.accountType)
  return withoutUndefined({
    ...previous,
    transId: response.transId && response.transId !== "0" ? response.transId : previous.transId,
    accountNumber: response.accountNumber || previous.accountNumber,
    accountType: response.accountType || previous.accountType,
    authCode: response.authCode || previous.authCode,
    card_brand: card.card_brand ?? previous.card_brand,
    card_last4: card.card_last4 ?? previous.card_last4,
    ...extra,
  })
}

/** Data refreshed from `getTransactionDetails`. */
export function fromTransactionDetails(
  previous: AuthorizeNetSessionData,
  details: AnetTransactionDetails
): AuthorizeNetSessionData {
  const accountNumber = details.payment?.creditCard?.cardNumber
  const accountType = details.payment?.creditCard?.cardType
  const card = cardFields(accountNumber, accountType)
  return withoutUndefined({
    ...previous,
    transId: details.transId || previous.transId,
    transactionStatus: details.transactionStatus,
    accountNumber: accountNumber || previous.accountNumber,
    accountType: accountType || previous.accountType,
    authCode: details.authCode || previous.authCode,
    card_brand: card.card_brand ?? previous.card_brand,
    card_last4: card.card_last4 ?? previous.card_last4,
  })
}

/** Keys that carry a token and that this provider never keeps once it has been used. */
const SCRUBBED_KEYS = ["opaque_data"] as const

/**
 * Writes the token as `null`, for data returned after the token was used or thrown away. Medusa
 * merges a provider's data into the stored object (`assign` with `mergeObjectProperties`), so a key
 * left out stays in the database: it has to be overwritten with `null` to go.
 */
export function scrubbed(
  data: AuthorizeNetSessionData,
  stored: Record<string, unknown> | undefined
): AuthorizeNetSessionData {
  const next = { ...data } as Record<string, unknown>
  for (const key of SCRUBBED_KEYS) {
    if (stored?.[key] != null || key in next) {
      next[key] = null
    }
  }
  return next as AuthorizeNetSessionData
}

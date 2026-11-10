import { MedusaError } from "@medusajs/framework/utils"
import { MollieApiError } from "../../../../lib/mollie-client"
import type { MollieCart } from "../../../../workflows/get-mollie-cart"
import MollieService from "../../services/mollie"
import type { MollieOptions } from "../../types"

/** A Medusa session id: `payses_` and a 26-character ULID. */
export const SESSION_ID = "payses_01JBTESTAAAAAAAAAAAAAAAAAA"
export const COLLECTION_ID = "pay_col_1"
export const PAYMENT_ID = "tr_7UhSN1zuXS"
export const API_KEY = "test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM"
export const RETURN_URL = "https://shop.example.com/api/payment-return?provider=mollie&cart_id=cart_1&locale=nl"
export const WEBHOOK_URL = "https://api.example.com/hooks/payment/mollie_mollie"
export const CHECKOUT_URL = "https://www.mollie.com/checkout/select-method/7UhSN1zuXS"

export const DEFAULT_OPTIONS: MollieOptions = {
  apiKey: API_KEY,
  webhookUrl: WEBHOOK_URL,
  capture: "automatic",
}

export const CART: MollieCart = {
  id: "cart_1",
  email: "jan@example.com",
  billing_address: {
    first_name: "Jan",
    last_name: "Jansen",
    address_1: "Keizersgracht 126",
    city: "Amsterdam",
    postal_code: "1015 CW",
    country_code: "nl",
    phone: "06 12345678",
  },
  shipping_address: {
    first_name: "Piet",
    last_name: "Jansen",
    address_1: "Prinsengracht 2",
    address_2: "Achterhuis",
    city: "Amsterdam",
    postal_code: "1015 DV",
    country_code: "nl",
  },
}

export function makeLogger() {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any
}

/** A Mollie SDK client stand-in: every method a jest mock the test sets up. */
export function makeClient() {
  return {
    payments: { create: jest.fn(), get: jest.fn(), cancel: jest.fn(), releaseAuthorization: jest.fn() },
    captures: { create: jest.fn() },
    refunds: { create: jest.fn(), list: jest.fn() },
  }
}

export type FakeClient = ReturnType<typeof makeClient>

export function makeProvider(options: Partial<MollieOptions> = {}, cart: MollieCart | null = CART) {
  const logger = makeLogger()
  const client = makeClient()
  const provider = new (MollieService as any)({ logger }, { id: "mollie-1" })
  provider.resolveOptions = async () => ({ ...DEFAULT_OPTIONS, ...options })
  provider.getClient = () => client
  provider.getPaymentCollectionId = jest.fn().mockResolvedValue(COLLECTION_ID)
  provider.getMollieCart = jest.fn().mockResolvedValue(cart)
  provider.paymentSessionExists = jest.fn().mockResolvedValue(true)
  return { provider, client, logger }
}

/** A Mollie payment as the SDK returns it, open by default. */
export function payment(overrides: Record<string, unknown> = {}) {
  const status = (overrides.status as string | undefined) ?? "open"
  return {
    resource: "payment",
    id: PAYMENT_ID,
    mode: "test",
    description: "Cart cart_1",
    amount: { currency: "EUR", value: "19.99" },
    status,
    method: status === "open" ? null : "creditcard",
    captureMode: "automatic",
    sequenceType: "oneoff",
    profileId: "pfl_QkEhN94Ba",
    createdAt: "2026-11-02T10:00:00+00:00",
    expiresAt: status === "open" ? "2026-11-02T10:15:00+00:00" : undefined,
    metadata: { session_id: SESSION_ID, cart_id: "cart_1" },
    isCancelable: status === "open",
    details: status === "open" ? null : { cardNumber: "6787", cardLabel: "Mastercard" },
    links: {
      self: { href: `https://api.mollie.com/v2/payments/${PAYMENT_ID}`, type: "application/hal+json" },
      dashboard: { href: `https://my.mollie.com/dashboard/payments/${PAYMENT_ID}`, type: "text/html" },
      ...(status === "open" ? { checkout: { href: CHECKOUT_URL, type: "text/html" } } : {}),
    },
    ...overrides,
  }
}

/** Session data after `initiatePayment`. */
export function sessionData(overrides: Record<string, unknown> = {}) {
  return {
    session_id: SESSION_ID,
    redirect_url: RETURN_URL,
    locale: "nl",
    id: PAYMENT_ID,
    status: "open",
    mode: "test",
    checkout_url: CHECKOUT_URL,
    expires_at: "2026-11-02T10:15:00+00:00",
    amount: 19.99,
    currency_code: "eur",
    capture_mode: "automatic",
    method: null,
    card_brand: null,
    card_last4: null,
    failure_reason: null,
    ...overrides,
  }
}

/** Payment data once the buyer has paid. */
export function paidData(overrides: Record<string, unknown> = {}) {
  return sessionData({
    status: "paid",
    checkout_url: null,
    expires_at: null,
    method: "creditcard",
    card_brand: "Mastercard",
    card_last4: "6787",
    ...overrides,
  })
}

/** A Mollie API error as the client wrapper throws it. */
export function mollieError(status: number, detail: string) {
  const type =
    status === 404 || status === 410
      ? MedusaError.Types.NOT_FOUND
      : status === 422
        ? MedusaError.Types.INVALID_DATA
        : MedusaError.Types.UNEXPECTED_STATE
  return new MollieApiError(type, `Mollie call failed: ${detail} (${status})`, { status, title: "Error", detail })
}

/** Every string the logger received, to check what never reaches a log. */
export function logged(logger: ReturnType<typeof makeLogger>) {
  return ["debug", "info", "warn", "error"]
    .flatMap((level) => (logger[level] as jest.Mock).mock.calls.map((call: unknown[]) => call.map(String).join(" ")))
    .join("\n")
}

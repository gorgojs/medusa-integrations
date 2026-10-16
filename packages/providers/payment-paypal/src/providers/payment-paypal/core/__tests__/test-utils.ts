import { AxiosError, AxiosHeaders } from "axios"
import { toPayPalError } from "../../../../lib/paypal-client"
import PayPalService from "../../services/paypal"
import type { PayPalOptions } from "../../types"

export const COLLECTION_ID = "pay_col_1"
export const SESSION_ID = "payses_1"
export const ORDER_ID = "ORDER-1"

export const DEFAULT_OPTIONS: PayPalOptions = {
  environment: "sandbox",
  clientId: "client-id",
  clientSecret: "client-secret",
  intent: "capture",
  landingPage: "NO_PREFERENCE",
}

export function makeLogger() {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any
}

/** A PayPalClient stand-in: every method a jest mock the test sets up. */
export function makeClient() {
  return {
    createOrder: jest.fn(),
    getOrder: jest.fn(),
    patchOrder: jest.fn().mockResolvedValue(undefined),
    authorizeOrder: jest.fn(),
    captureOrder: jest.fn(),
    captureAuthorization: jest.fn(),
    voidAuthorization: jest.fn(),
    refundCapture: jest.fn(),
    verifyWebhookSignature: jest.fn(),
    getWebhook: jest.fn(),
  }
}

export type FakeClient = ReturnType<typeof makeClient>

export function makeProvider(options: Partial<PayPalOptions> = {}) {
  const logger = makeLogger()
  const client = makeClient()
  const provider = new (PayPalService as any)({ logger }, { id: "paypal-1" })
  provider.resolveOptions = async () => ({ ...DEFAULT_OPTIONS, ...options })
  provider.getClient = () => client
  provider.getPaymentCollectionId = jest.fn().mockResolvedValue(COLLECTION_ID)
  return { provider, client, logger }
}

/** A PayPal order as the Orders API returns it. */
export function order(overrides: Record<string, any> = {}, unit: Record<string, any> = {}) {
  return {
    id: ORDER_ID,
    intent: "CAPTURE",
    status: "CREATED",
    purchase_units: [
      {
        reference_id: COLLECTION_ID,
        custom_id: SESSION_ID,
        amount: { currency_code: "EUR", value: "10.00" },
        ...unit,
      },
    ],
    ...overrides,
  }
}

export function withPayments(payments: Record<string, any>, overrides: Record<string, any> = {}) {
  return order({ status: "COMPLETED", ...overrides }, { payments })
}

/** The PayPalApiError the client throws for an HTTP error from PayPal. */
export function paypalError(operation: string, status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() } as any
  return toPayPalError(
    operation,
    new AxiosError("Request failed", AxiosError.ERR_BAD_REQUEST, config, {}, {
      status,
      statusText: "",
      data,
      headers: {},
      config,
    })
  )
}

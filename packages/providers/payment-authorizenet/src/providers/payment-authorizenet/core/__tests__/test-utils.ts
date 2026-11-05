import { MedusaError } from "@medusajs/framework/utils"
import { AuthorizeNetApiError } from "../../../../lib/authorizenet-client"
import type { AnetTransactionDetails } from "../../../../types"
import type { AuthorizeNetCart } from "../../../../workflows/get-authorizenet-cart"
import AuthorizeNetService from "../../services/authorizenet"
import type { AuthorizeNetOptions } from "../../types"

/** A Medusa session id: `payses_` and a 26-character ULID, 33 characters in all. */
export const SESSION_ID = "payses_01JBTESTAAAAAAAAAAAAAAAAAA"
export const COLLECTION_ID = "pay_col_1"
export const TRANS_ID = "60001"
export const TOKEN = "eyJjb2RlIjoiNTBfMl8wNjAwMDUzMDAyQkU2QzgzQUZEOTYzNDg2OTI0In0="
export const OPAQUE_DATA = { dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT", dataValue: TOKEN }

export const DEFAULT_OPTIONS: AuthorizeNetOptions = {
  environment: "sandbox",
  apiLoginId: "login-123",
  transactionKey: "SECRET-transaction-key",
  publicClientKey: "public-client-key",
  signatureKey: "A1B2C3",
  capture: "automatic",
  googlePay: false,
}

export const CART: AuthorizeNetCart = {
  id: "cart_1",
  email: "buyer@example.com",
  billing_address: {
    first_name: "Jane",
    last_name: "Doe",
    address_1: "1 Main St",
    city: "Indianapolis",
    province: "IN",
    postal_code: "46201",
    country_code: "us",
    phone: "+13175550100",
  },
  shipping_address: {
    first_name: "John",
    last_name: "Doe",
    address_1: "2 Side St",
    address_2: "Apt 3",
    city: "Carmel",
    province: "IN",
    postal_code: "46032",
    country_code: "us",
    phone: "+13175550199",
  },
}

/** What the vendor's `payment-authorizenet-medusa` left in `payment.data`: its transactionResponse. */
export const VENDOR_DATA = {
  responseCode: "1",
  authCode: "ABC123",
  avsResultCode: "Y",
  cvvResultCode: "P",
  transId: TRANS_ID,
  refTransID: "",
  accountNumber: "XXXX1111",
  accountType: "Visa",
  messages: { message: [{ code: "1", description: "This transaction has been approved." }] },
}

export function makeLogger() {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any
}

/** An Authorize.net client stand-in: every method a jest mock the test sets up. */
export function makeClient() {
  return {
    createTransaction: jest.fn(),
    getTransactionDetails: jest.fn(),
    getMerchantDetails: jest.fn(),
    listWebhooks: jest.fn(),
  }
}

export type FakeClient = ReturnType<typeof makeClient>

export function makeProvider(options: Partial<AuthorizeNetOptions> = {}, cart: AuthorizeNetCart | null = CART) {
  const logger = makeLogger()
  const client = makeClient()
  const provider = new (AuthorizeNetService as any)({ logger }, { id: "authorizenet-1" })
  provider.resolveOptions = async () => ({ ...DEFAULT_OPTIONS, ...options })
  provider.getClient = () => client
  provider.getPaymentCollectionId = jest.fn().mockResolvedValue(COLLECTION_ID)
  provider.getAuthorizeNetCart = jest.fn().mockResolvedValue(cart)
  return { provider, client, logger }
}

/** A transaction the gateway accepted, as `AuthorizeNetClient.createTransaction` resolves it. */
export function approved(overrides: Record<string, unknown> = {}, responseCode: "1" | "4" = "1") {
  return {
    refId: SESSION_ID,
    responseCode,
    transactionResponse: {
      responseCode,
      authCode: "ABC123",
      transId: TRANS_ID,
      accountNumber: "XXXX1111",
      accountType: "Visa",
      ...overrides,
    },
  }
}

/** `getTransactionDetails` for a transaction in the given status. */
export function details(transactionStatus: string, overrides: Partial<AnetTransactionDetails> = {}) {
  return {
    messages: { resultCode: "Ok" },
    transrefId: SESSION_ID,
    transaction: {
      transId: TRANS_ID,
      transactionStatus,
      authAmount: "19.99",
      settleAmount: "19.99",
      authCode: "ABC123",
      payment: { creditCard: { cardNumber: "XXXX1111", expirationDate: "XXXX", cardType: "Visa" } },
      ...overrides,
    },
  }
}

/** A gateway error as the client throws it. */
export function gatewayError(code: string, text: string, responseCode = "3") {
  return new AuthorizeNetApiError(
    MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
    `Authorize.net createTransaction failed: ${text} code=${code} responseCode=${responseCode}`,
    { resultCode: "Error", responseCode, anetCode: code }
  )
}

/** Session data after `initiatePayment`. */
export function sessionData(overrides: Record<string, unknown> = {}) {
  return {
    session_id: SESSION_ID,
    amount: 19.99,
    currency_code: "usd",
    opaque_data: OPAQUE_DATA,
    ...overrides,
  }
}

/** Payment data after an approved authorization. */
export function paymentData(overrides: Record<string, unknown> = {}) {
  return {
    session_id: SESSION_ID,
    amount: 19.99,
    currency_code: "usd",
    opaque_data: null,
    transId: TRANS_ID,
    transactionStatus: "capturedPendingSettlement",
    accountNumber: "XXXX1111",
    accountType: "Visa",
    authCode: "ABC123",
    card_brand: "visa",
    card_last4: "1111",
    ...overrides,
  }
}

/** The body of the n-th `createTransaction` call: the transaction request and the refId. */
export function sent(client: FakeClient, call = 0) {
  const [request, refId] = client.createTransaction.mock.calls[call]
  return { request, refId }
}

/** Every string the logger received, to check what never reaches a log. */
export function logged(logger: ReturnType<typeof makeLogger>) {
  return ["debug", "info", "warn", "error"]
    .flatMap((level) => (logger[level] as jest.Mock).mock.calls.map((call: unknown[]) => call.map(String).join(" ")))
    .join("\n")
}

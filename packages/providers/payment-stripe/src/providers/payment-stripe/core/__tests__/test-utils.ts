import Stripe from "stripe"
import StripeService from "../../services/stripe"
import type { StripeOptions } from "../../types"
import type { StripeCart } from "../../../../workflows/get-stripe-cart"

export const COLLECTION_ID = "pay_col_1"
export const SESSION_ID = "payses_1"
export const INTENT_ID = "pi_1"
export const CUSTOMER_ID = "cus_1"

export const DEFAULT_OPTIONS: StripeOptions = {
  secretKey: "sk_test_123",
  publishableKey: "pk_test_123",
  webhookSecret: "whsec_123",
  capture: "automatic",
  sendReceiptEmail: false,
}

export const CART: StripeCart = {
  id: "cart_1",
  email: "buyer@example.com",
  shipping_address: {
    first_name: "Jane",
    last_name: "Doe",
    address_1: "1 Main St",
    address_2: "Apt 2",
    city: "Springfield",
    province: "IL",
    postal_code: "62701",
    country_code: "us",
    phone: "+15555550100",
  },
}

export function makeLogger() {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any
}

/** A Stripe client stand-in: every method a jest mock the test sets up. */
export function makeStripe() {
  return {
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
      capture: jest.fn(),
      cancel: jest.fn(),
      update: jest.fn(),
    },
    refunds: { create: jest.fn() },
    customers: { create: jest.fn(), update: jest.fn(), del: jest.fn(), listPaymentMethods: jest.fn() },
    setupIntents: { create: jest.fn() },
    paymentMethods: { retrieve: jest.fn(), detach: jest.fn() },
    // the real signature check: it is local, no request reaches Stripe
    webhooks: realStripe.webhooks,
  }
}

const realStripe = new Stripe("sk_test_webhooks")

/** A webhook request as Medusa's route hands it to the provider, signed like Stripe signs it. */
export function signedWebhook(
  event: Record<string, unknown>,
  { secret = "whsec_123", timestamp }: { secret?: string; timestamp?: number } = {}
) {
  const body = JSON.stringify({ id: "evt_1", object: "event", ...event })
  const signature = realStripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp })
  return { data: JSON.parse(body), rawData: Buffer.from(body), headers: { "stripe-signature": signature } }
}

export type FakeStripe = ReturnType<typeof makeStripe>

export function makeProvider(options: Partial<StripeOptions> = {}, cart: StripeCart | null = CART) {
  const logger = makeLogger()
  const stripe = makeStripe()
  const provider = new (StripeService as any)({ logger }, { id: "stripe-1" })
  provider.resolveOptions = async () => ({ ...DEFAULT_OPTIONS, ...options })
  provider.getStripe = () => stripe
  provider.getPaymentCollectionId = jest.fn().mockResolvedValue(COLLECTION_ID)
  provider.getStripeCart = jest.fn().mockResolvedValue(cart)
  return { provider, stripe, logger }
}

/** A PaymentIntent as the API returns it. */
export function intent(overrides: Record<string, any> = {}) {
  return {
    id: INTENT_ID,
    object: "payment_intent",
    status: "requires_payment_method",
    amount: 1999,
    amount_received: 0,
    currency: "usd",
    capture_method: "automatic_async",
    client_secret: "pi_1_secret_abc",
    payment_method: null,
    latest_charge: null,
    metadata: { session_id: SESSION_ID },
    lastResponse: { requestId: "req_1", statusCode: 200 },
    ...overrides,
  }
}

/** What Medusa's core Stripe provider stored: the whole PaymentIntent merged with the session data. */
export function coreData(overrides: Record<string, any> = {}) {
  return {
    session_id: SESSION_ID,
    ...intent({
      status: "requires_capture",
      payment_method: { id: "pm_1", type: "card", card: { brand: "visa", last4: "4242" }, billing_details: { email: "buyer@example.com" } },
    }),
    ...overrides,
  }
}

export function invalidRequest(code: string, extra: Record<string, unknown> = {}) {
  return new Stripe.errors.StripeInvalidRequestError({ message: `Stripe says ${code}`, code, requestId: "req_err", statusCode: 400, ...extra } as any)
}

/** Every string the logger received, to check what never reaches a log. */
export function logged(logger: ReturnType<typeof makeLogger>) {
  return ["debug", "info", "warn", "error"]
    .flatMap((level) => (logger[level] as jest.Mock).mock.calls.map((call: unknown[]) => call.map(String).join(" ")))
    .join("\n")
}

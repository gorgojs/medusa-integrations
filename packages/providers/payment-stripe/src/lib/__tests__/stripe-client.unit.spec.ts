import Stripe from "stripe"
import { MedusaError } from "@medusajs/framework/utils"
import {
  callStripe,
  clearStripeClients,
  getStripe,
  STRIPE_API_VERSION,
  STRIPE_MAX_NETWORK_RETRIES,
  STRIPE_TIMEOUT_MS,
  StripeApiError,
  toStripeError,
} from "../stripe-client"

function makeLogger() {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any
}

afterEach(() => clearStripeClients())

describe("getStripe", () => {
  it("pins the API version, the timeout and the retries", () => {
    const client = getStripe("sk_test_123") as any
    expect(STRIPE_API_VERSION).toBe("2026-09-30.endive")
    expect(client.getApiField("version")).toBe(STRIPE_API_VERSION)
    expect(client.getApiField("timeout")).toBe(STRIPE_TIMEOUT_MS)
    expect(client.getMaxNetworkRetries()).toBe(STRIPE_MAX_NETWORK_RETRIES)
  })

  it("keeps one client per secret key", () => {
    expect(getStripe("sk_test_1")).toBe(getStripe("sk_test_1"))
    expect(getStripe("sk_test_1")).not.toBe(getStripe("sk_test_2"))
  })
})

describe("toStripeError", () => {
  it.each([
    [Stripe.errors.StripeCardError, MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR],
    [Stripe.errors.StripeInvalidRequestError, MedusaError.Types.INVALID_DATA],
    [Stripe.errors.StripeAuthenticationError, MedusaError.Types.UNAUTHORIZED],
    [Stripe.errors.StripePermissionError, MedusaError.Types.UNAUTHORIZED],
    [Stripe.errors.StripeIdempotencyError, MedusaError.Types.CONFLICT],
    [Stripe.errors.StripeAPIError, MedusaError.Types.UNEXPECTED_STATE],
    [Stripe.errors.StripeConnectionError, MedusaError.Types.UNEXPECTED_STATE],
  ])("maps %p to %s", (ErrorClass, type) => {
    const error = toStripeError("createPaymentIntent", new (ErrorClass as any)({ message: "boom" }))
    expect(error).toBeInstanceOf(StripeApiError)
    expect((error as StripeApiError).type).toBe(type)
  })

  it("keeps the code, the decline code, the request id and the PaymentIntent", () => {
    const paymentIntent = { id: "pi_1", status: "requires_payment_method" }
    const error = toStripeError(
      "confirmPaymentIntent",
      new Stripe.errors.StripeCardError({
        message: "Your card was declined.",
        code: "card_declined",
        decline_code: "insufficient_funds",
        requestId: "req_1",
        statusCode: 402,
        payment_intent: paymentIntent,
      } as any)
    ) as StripeApiError

    expect(error.message).toBe(
      "Stripe confirmPaymentIntent failed: Your card was declined. code=card_declined decline_code=insufficient_funds request_id=req_1"
    )
    expect(error).toMatchObject({
      stripeType: "StripeCardError",
      stripeCode: "card_declined",
      declineCode: "insufficient_funds",
      requestId: "req_1",
      statusCode: 402,
      code: "insufficient_funds",
    })
    expect(error.paymentIntent).toEqual(paymentIntent)
  })

  it("passes through what is not a Stripe error", () => {
    const plain = new Error("not stripe")
    expect(toStripeError("op", plain)).toBe(plain)
    const already = new StripeApiError(MedusaError.Types.INVALID_DATA, "x", {})
    expect(toStripeError("op", already)).toBe(already)
  })
})

describe("callStripe", () => {
  it("logs the ids and the response's id, status and request id, never the response body", async () => {
    const logger = makeLogger()
    const response = {
      id: "pi_1",
      object: "payment_intent",
      status: "requires_payment_method",
      client_secret: "pi_1_secret_abc",
      receipt_email: "buyer@example.com",
      lastResponse: { requestId: "req_1", statusCode: 200 },
    }

    await expect(callStripe(logger, "createPaymentIntent", { session_id: "payses_1", other: undefined }, async () => response)).resolves.toBe(response)

    const logged = logger.debug.mock.calls.map((call: unknown[]) => String(call[0])).join("\n")
    expect(logged).toContain('StripeClient.createPaymentIntent request: {"session_id":"payses_1"}')
    expect(logged).toContain('"id":"pi_1"')
    expect(logged).toContain('"request_id":"req_1"')
    expect(logged).not.toContain("secret")
    expect(logged).not.toContain("buyer@example.com")
  })

  it("throws a StripeApiError and logs only its type, code and request id", async () => {
    const logger = makeLogger()
    const failure = new Stripe.errors.StripeInvalidRequestError({
      message: "No such payment_intent: 'pi_x'; key sk_test_hidden",
      code: "resource_missing",
      requestId: "req_2",
    } as any)

    await expect(
      callStripe(logger, "retrievePaymentIntent", { payment_intent: "pi_x" }, async () => {
        throw failure
      })
    ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA, stripeCode: "resource_missing" })

    const logged = logger.debug.mock.calls.map((call: unknown[]) => String(call[0])).join("\n")
    expect(logged).toContain('"code":"resource_missing"')
    expect(logged).not.toContain("sk_test_hidden")
  })

  it("lets a non-Stripe error through unchanged", async () => {
    const logger = makeLogger()
    const plain = new Error("socket hang up")
    await expect(
      callStripe(logger, "op", {}, async () => {
        throw plain
      })
    ).rejects.toBe(plain)
  })
})

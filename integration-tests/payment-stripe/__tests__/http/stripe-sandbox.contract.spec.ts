/**
 * Live contract tests against a Stripe account in test mode.
 *
 * Purpose: catch changes in the PaymentIntents and Refunds APIs, and in the currency rules, that the
 * nock-backed suites cannot see, by running the plugin's own client and amount conversion (from the
 * built package) against Stripe on the pinned API version.
 *
 * Opt-in: skipped unless CI_STRIPE_SECRET_KEY is set to a test-mode secret key (`sk_test_…`).
 *
 *   CI_STRIPE_SECRET_KEY=sk_test_… yarn test:integration:http stripe-sandbox
 */
import { randomUUID } from "node:crypto"
import { clearStripeClients, getStripe, STRIPE_API_VERSION, StripeApiError, toStripeError } from "@gorgo/medusa-payment-stripe/lib/stripe-client"
import { toStripeAmount } from "@gorgo/medusa-payment-stripe/utils/amounts"

jest.setTimeout(60 * 1000)

const SECRET_KEY = process.env.CI_STRIPE_SECRET_KEY

const describeIfKey = SECRET_KEY?.startsWith("sk_test_") ? describe : describe.skip

/** A card PaymentIntent confirmed on the server, the way a test can without a browser. */
const confirmedCard = (amount: number, currency: string, extra: Record<string, unknown> = {}) => ({
  amount,
  currency,
  payment_method: "pm_card_visa",
  confirm: true,
  automatic_payment_methods: { enabled: true, allow_redirects: "never" as const },
  metadata: { session_id: `payses_contract_${Date.now()}` },
  ...extra,
})

describeIfKey("Stripe contract (test mode)", () => {
  afterAll(() => clearStripeClients())

  const stripe = () => getStripe(SECRET_KEY!)

  it("answers on the pinned API version", async () => {
    const list = await stripe().paymentIntents.list({ limit: 1 })
    expect(list.object).toBe("list")
    expect(STRIPE_API_VERSION).toBe("2026-09-30.endive")
  })

  it("authorizes, captures in full and refunds part of a card payment", async () => {
    const amount = toStripeAmount(10, "usd")
    const intent = await stripe().paymentIntents.create(confirmedCard(amount, "usd", { capture_method: "manual" }), {
      idempotencyKey: randomUUID(),
    })
    expect(intent.status).toBe("requires_capture")

    const captured = await stripe().paymentIntents.capture(intent.id, {}, { idempotencyKey: randomUUID() })
    expect(captured.status).toBe("succeeded")
    expect(captured.amount_received).toBe(1000)

    const refund = await stripe().refunds.create(
      { payment_intent: intent.id, amount: toStripeAmount(4, "usd") },
      { idempotencyKey: randomUUID() }
    )
    expect(["succeeded", "pending"]).toContain(refund.status)
    expect(refund.amount).toBe(400)
  })

  it("returns the same PaymentIntent for a repeated idempotency key", async () => {
    const key = randomUUID()
    const params = { amount: 1000, currency: "usd", metadata: { session_id: key } }
    const first = await stripe().paymentIntents.create(params, { idempotencyKey: key })
    const second = await stripe().paymentIntents.create(params, { idempotencyKey: key })
    expect(second.id).toBe(first.id)
  })

  it("cancels an authorization, and refuses to cancel a captured payment", async () => {
    const held = await stripe().paymentIntents.create(confirmedCard(1000, "usd", { capture_method: "manual" }))
    await expect(stripe().paymentIntents.cancel(held.id)).resolves.toMatchObject({ status: "canceled" })

    const paid = await stripe().paymentIntents.create(confirmedCard(1000, "usd"))
    const error = await stripe()
      .paymentIntents.cancel(paid.id)
      .catch((e: unknown) => toStripeError("cancelPaymentIntent", e))
    expect(error).toBeInstanceOf(StripeApiError)
    expect((error as StripeApiError).stripeCode).toBe("payment_intent_unexpected_state")
  })

  it("declines a card with the decline code", async () => {
    const error = await stripe()
      .paymentIntents.create(confirmedCard(1000, "usd", { payment_method: "pm_card_chargeDeclined" }))
      .catch((e: unknown) => toStripeError("createPaymentIntent", e))
    expect((error as StripeApiError).stripeType).toBe("StripeCardError")
    expect((error as StripeApiError).stripeCode).toBe("card_declined")
  })

  it("takes UGX and three-decimal amounts the way toStripeAmount sends them", async () => {
    const ugx = await stripe().paymentIntents.create({ amount: toStripeAmount(5000, "ugx"), currency: "ugx" })
    expect(ugx.amount).toBe(500000)

    // the converter rounds 5.124 KWD to 5.120: Stripe's rule that the last digit is 0
    const kwd = await stripe().paymentIntents.create({ amount: toStripeAmount("5.124", "kwd"), currency: "kwd" })
    expect(kwd.amount).toBe(5120)
    const unrounded = await stripe()
      .paymentIntents.create({ amount: 5124, currency: "kwd" })
      .catch((e: unknown) => toStripeError("createPaymentIntent", e))
    expect(unrounded).toBeInstanceOf(StripeApiError)
  })
})

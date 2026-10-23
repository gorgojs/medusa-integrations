import { MedusaError, PaymentSessionStatus } from "@medusajs/framework/utils"
import { coreData, intent, INTENT_ID, invalidRequest, logged, makeProvider, SESSION_ID } from "./test-utils"

const session = { session_id: SESSION_ID, id: INTENT_ID, client_secret: "pi_1_secret_abc", amount: 1999, currency: "usd", status: "requires_payment_method" }

const card = { id: "pm_1", type: "card", card: { brand: "visa", last4: "4242", wallet: { type: "google_pay" } } }

describe("StripeBase.authorizePayment", () => {
  it.each([
    ["requires_capture", PaymentSessionStatus.AUTHORIZED],
    ["succeeded", PaymentSessionStatus.CAPTURED],
  ])("maps %s to %s and drops the client secret", async (status, expected) => {
    const { provider, stripe, logger } = makeProvider()
    stripe.paymentIntents.retrieve.mockResolvedValue(intent({ status, payment_method: card }))

    const output = await provider.authorizePayment({ data: session })

    expect(stripe.paymentIntents.retrieve).toHaveBeenCalledWith(INTENT_ID, { expand: ["payment_method", "latest_charge"] })
    expect(output.status).toBe(expected)
    // null, not absent: Medusa merges the data into the stored session, so an absent key would stay
    expect(output.data.client_secret).toBeNull()
    expect(output.data).toMatchObject({ card_brand: "visa", card_last4: "4242", wallet: "google_pay", status })
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`PaymentIntent ${INTENT_ID} ${status}`))
  })

  it.each([
    ["requires_action", PaymentSessionStatus.REQUIRES_MORE],
    ["requires_payment_method", PaymentSessionStatus.PENDING],
    ["processing", PaymentSessionStatus.PENDING],
  ])("keeps the client secret while the storefront still has to act (%s)", async (status, expected) => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.retrieve.mockResolvedValue(intent({ status }))

    const output = await provider.authorizePayment({ data: session })

    expect(output.status).toBe(expected)
    expect(output.data.client_secret).toBe("pi_1_secret_abc")
  })

  it("reports a declined attempt as an error", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.retrieve.mockResolvedValue(intent({ last_payment_error: { code: "card_declined" } }))

    expect((await provider.authorizePayment({ data: session })).status).toBe(PaymentSessionStatus.ERROR)
  })

  it("refuses a PaymentIntent whose amount differs from the session's", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.retrieve.mockResolvedValue(intent({ status: "succeeded", amount: 999 }))

    await expect(provider.authorizePayment({ data: session })).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
  })

  it("authorizes a session the core provider created, and reduces its data", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.retrieve.mockResolvedValue(intent({ status: "requires_capture" }))

    const output = await provider.authorizePayment({ data: coreData({ status: "requires_payment_method" }) })

    expect(output.status).toBe(PaymentSessionStatus.AUTHORIZED)
    expect(output.data).not.toHaveProperty("metadata")
    expect(output.data).not.toHaveProperty("object")
    expect(output.data).toMatchObject({ id: INTENT_ID, session_id: SESSION_ID })
  })

  it("needs the PaymentIntent id", async () => {
    const { provider } = makeProvider()
    await expect(provider.authorizePayment({ data: { session_id: SESSION_ID } })).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
  })

  it("logs a failed retrieve with Stripe's code and the ids", async () => {
    const { provider, stripe, logger } = makeProvider()
    stripe.paymentIntents.retrieve.mockRejectedValue(invalidRequest("resource_missing"))

    await expect(provider.authorizePayment({ data: session })).rejects.toMatchObject({ stripeCode: "resource_missing" })
    expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/authorizePayment failed: .* code=resource_missing .*"payment_intent":"pi_1"/))
    expect(logged(logger)).not.toContain("pi_1_secret_abc")
  })
})

describe("StripeBase.capturePayment", () => {
  const authorized = { ...session, status: "requires_capture", client_secret: undefined }

  it("captures the whole PaymentIntent without an amount, with the capture id as idempotency key", async () => {
    const { provider, stripe, logger } = makeProvider()
    stripe.paymentIntents.capture.mockResolvedValue(intent({ status: "succeeded", amount_received: 1999, payment_method: card }))

    const output = await provider.capturePayment({ data: authorized, context: { idempotency_key: "capt_1" } })

    expect(stripe.paymentIntents.capture).toHaveBeenCalledWith(
      INTENT_ID,
      { expand: ["payment_method", "latest_charge"] },
      { idempotencyKey: "capt_1" }
    )
    expect(output.data).toMatchObject({ status: "succeeded", amount_received: 1999, card_last4: "4242" })
    expect(output.data).not.toHaveProperty("client_secret")
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("captured"))
  })

  it("makes no call for a PaymentIntent already captured", async () => {
    const { provider, stripe } = makeProvider()
    const captured = { ...authorized, status: "succeeded" }

    expect(await provider.capturePayment({ data: captured })).toEqual({ data: captured })
    expect(stripe.paymentIntents.capture).not.toHaveBeenCalled()
  })

  it("treats a repeated capture of a captured PaymentIntent as success", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.capture.mockRejectedValue(
      invalidRequest("payment_intent_unexpected_state", { payment_intent: intent({ status: "succeeded", amount_received: 1999 }) })
    )

    const output = await provider.capturePayment({ data: authorized })

    expect(output.data).toMatchObject({ status: "succeeded", amount_received: 1999 })
  })

  it("fails on any other unexpected state", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.capture.mockRejectedValue(
      invalidRequest("payment_intent_unexpected_state", { payment_intent: intent({ status: "canceled" }) })
    )

    await expect(provider.capturePayment({ data: authorized })).rejects.toMatchObject({ stripeCode: "payment_intent_unexpected_state" })
  })

  it("captures a payment the core provider authorized", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.capture.mockResolvedValue(intent({ status: "succeeded" }))

    await provider.capturePayment({ data: coreData() })

    expect(stripe.paymentIntents.capture.mock.calls[0][0]).toBe(INTENT_ID)
  })
})

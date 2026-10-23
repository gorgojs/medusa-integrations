import Stripe from "stripe"
import { MedusaError } from "@medusajs/framework/utils"
import { coreData, intent, INTENT_ID, invalidRequest, makeProvider, SESSION_ID } from "./test-utils"

const captured = { session_id: SESSION_ID, id: INTENT_ID, amount: 1999, currency: "usd", status: "succeeded" }

describe("StripeBase.refundPayment", () => {
  it("refunds the amount Medusa asks for, with the refund id as idempotency key", async () => {
    const { provider, stripe, logger } = makeProvider()
    stripe.refunds.create.mockResolvedValue({ id: "re_1", status: "succeeded", amount: 500 })

    const output = await provider.refundPayment({ amount: 5, data: captured, context: { idempotency_key: "ref_1" } })

    expect(stripe.refunds.create).toHaveBeenCalledWith(
      { payment_intent: INTENT_ID, amount: 500, metadata: { medusa_idempotency_key: "ref_1", session_id: SESSION_ID } },
      { idempotencyKey: "ref_1" }
    )
    expect(output.data.refunds).toEqual([{ id: "re_1", status: "succeeded", amount: 500 }])
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("re_1 succeeded"))
  })

  it("keeps two partial refunds apart: different keys, both recorded", async () => {
    const { provider, stripe } = makeProvider()
    stripe.refunds.create
      .mockResolvedValueOnce({ id: "re_1", status: "succeeded", amount: 300 })
      .mockResolvedValueOnce({ id: "re_2", status: "pending", amount: 300 })

    const first = await provider.refundPayment({ amount: 3, data: captured, context: { idempotency_key: "ref_1" } })
    const second = await provider.refundPayment({ amount: 3, data: first.data, context: { idempotency_key: "ref_2" } })

    expect(stripe.refunds.create.mock.calls.map((call) => call[1].idempotencyKey)).toEqual(["ref_1", "ref_2"])
    expect(second.data.refunds).toHaveLength(2)
  })

  it("converts the amount in the payment's currency", async () => {
    const { provider, stripe } = makeProvider()
    stripe.refunds.create.mockResolvedValue({ id: "re_1", status: "succeeded", amount: 500 })

    await provider.refundPayment({ amount: 5, data: { ...captured, currency: "ugx" } })

    expect(stripe.refunds.create.mock.calls[0][0].amount).toBe(500)
  })

  it("refuses a refund Stripe would not pass on, after a full refund in the Dashboard (regression of D7)", async () => {
    const { provider, stripe } = makeProvider()
    stripe.refunds.create.mockRejectedValue(invalidRequest("charge_already_refunded"))

    await expect(provider.refundPayment({ amount: 5, data: captured })).rejects.toMatchObject({
      type: MedusaError.Types.NOT_ALLOWED,
      code: "charge_already_refunded",
    })
  })

  it.each(["failed", "canceled"])("fails when Stripe reports the refund %s", async (status) => {
    const { provider, stripe } = makeProvider()
    stripe.refunds.create.mockResolvedValue({ id: "re_1", status, amount: 500, failure_reason: "expired_or_canceled_card" })

    await expect(provider.refundPayment({ amount: 5, data: captured })).rejects.toThrow(`ended as ${status}: expired_or_canceled_card`)
  })

  it.each([[0], ["0.001"]])("never sends a zero refund (%p)", async (amount) => {
    const { provider, stripe } = makeProvider()
    await expect(provider.refundPayment({ amount, data: captured })).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })

  it("needs the currency and the PaymentIntent", async () => {
    const { provider } = makeProvider()
    await expect(provider.refundPayment({ amount: 5, data: { ...captured, currency: undefined } })).rejects.toThrow("has no currency")
    await expect(provider.refundPayment({ amount: 5, data: { session_id: SESSION_ID } })).rejects.toThrow("needs the PaymentIntent id")
  })

  it("refunds a payment the core provider captured", async () => {
    const { provider, stripe } = makeProvider()
    stripe.refunds.create.mockResolvedValue({ id: "re_1", status: "succeeded", amount: 500 })

    const output = await provider.refundPayment({ amount: 5, data: coreData({ status: "succeeded" }) })

    expect(stripe.refunds.create.mock.calls[0][0]).toMatchObject({ payment_intent: INTENT_ID, amount: 500 })
    // the core provider stored the secret and the payment method with the billing details: both are cleared
    expect(output.data.client_secret).toBeNull()
    expect(output.data.payment_method).toBeNull()
  })
})

describe("StripeBase.cancelPayment", () => {
  const authorized = { ...captured, status: "requires_capture" }

  it("cancels an authorization", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.cancel.mockResolvedValue(intent({ status: "canceled" }))

    const output = await provider.cancelPayment({ data: authorized, context: { idempotency_key: "pay_1" } })

    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith(INTENT_ID, {}, { idempotencyKey: "pay_1" })
    expect(output.data.status).toBe("canceled")
  })

  it("refuses a captured payment instead of refunding it", async () => {
    const { provider, stripe } = makeProvider()
    await expect(provider.cancelPayment({ data: captured })).rejects.toMatchObject({ type: MedusaError.Types.NOT_ALLOWED })
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled()
  })

  it("refuses a payment Stripe reports captured although the session says otherwise", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.cancel.mockRejectedValue(
      invalidRequest("payment_intent_unexpected_state", { payment_intent: intent({ status: "succeeded" }) })
    )

    await expect(provider.cancelPayment({ data: authorized })).rejects.toMatchObject({ type: MedusaError.Types.NOT_ALLOWED })
  })

  it("accepts a PaymentIntent Stripe has already canceled", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.cancel.mockRejectedValue(
      invalidRequest("payment_intent_unexpected_state", { payment_intent: intent({ status: "canceled" }) })
    )

    expect((await provider.cancelPayment({ data: authorized })).data.status).toBe("canceled")
  })

  it("does nothing without a PaymentIntent or for a canceled one", async () => {
    const { provider, stripe } = makeProvider()
    await provider.cancelPayment({ data: { session_id: SESSION_ID } })
    await provider.cancelPayment({ data: { ...authorized, status: "canceled" } })
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled()
  })
})

describe("StripeBase.deletePayment", () => {
  const pending = { session_id: SESSION_ID, id: INTENT_ID, status: "requires_payment_method", client_secret: "pi_1_secret_abc" }

  it("cancels the PaymentIntent of a deleted session", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.cancel.mockResolvedValue(intent({ status: "canceled" }))

    const output = await provider.deletePayment({ data: pending })

    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith(INTENT_ID, {}, undefined)
    expect(output.data.status).toBe("canceled")
  })

  it("never fails because of Stripe", async () => {
    const { provider, stripe, logger } = makeProvider()
    stripe.paymentIntents.cancel.mockRejectedValue(new Stripe.errors.StripeAPIError({ message: "down" } as any))

    expect(await provider.deletePayment({ data: pending })).toEqual({ data: pending })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("could not cancel PaymentIntent pi_1"))
  })

  it("leaves a captured, a canceled or a missing PaymentIntent alone", async () => {
    const { provider, stripe } = makeProvider()
    await provider.deletePayment({ data: { ...pending, status: "succeeded" } })
    await provider.deletePayment({ data: { ...pending, status: "canceled" } })
    await provider.deletePayment({ data: { session_id: SESSION_ID } })
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled()
  })
})

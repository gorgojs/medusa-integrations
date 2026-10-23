import { MedusaError, PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import StripeService from "../../services/stripe"
import { COLLECTION_ID, intent, INTENT_ID, makeProvider, SESSION_ID } from "./test-utils"

const session = { session_id: SESSION_ID, id: INTENT_ID, amount: 1999, currency: "usd", status: "requires_payment_method", client_secret: "pi_1_secret_abc" }

describe("StripeBase.updatePayment", () => {
  it("changes the amount and the address of an unconfirmed PaymentIntent", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.retrieve.mockResolvedValue(intent())
    stripe.paymentIntents.update.mockResolvedValue(intent({ amount: 2500 }))

    const output = await provider.updatePayment({ amount: 25, currency_code: "usd", data: session })

    expect(provider.getStripeCart).toHaveBeenCalledWith(COLLECTION_ID)
    expect(stripe.paymentIntents.update).toHaveBeenCalledWith(INTENT_ID, {
      amount: 2500,
      shipping: expect.objectContaining({ name: "Jane Doe" }),
    })
    expect(output.data).toMatchObject({ amount: 2500, client_secret: "pi_1_secret_abc" })
  })

  it("changes only the amount of an express payment", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.retrieve.mockResolvedValue(intent())
    stripe.paymentIntents.update.mockResolvedValue(intent({ amount: 2500 }))

    await provider.updatePayment({ amount: 25, currency_code: "usd", data: { ...session, express: true } })

    expect(stripe.paymentIntents.update).toHaveBeenCalledWith(INTENT_ID, { amount: 2500 })
  })

  it("leaves a confirmed PaymentIntent alone", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.retrieve.mockResolvedValue(intent({ status: "requires_capture" }))

    const output = await provider.updatePayment({ amount: 25, currency_code: "usd", data: session })

    expect(stripe.paymentIntents.update).not.toHaveBeenCalled()
    expect(output.data.client_secret).toBeNull()
  })

  it("does nothing without a PaymentIntent", async () => {
    const { provider, stripe } = makeProvider()
    await provider.updatePayment({ amount: 25, currency_code: "usd", data: { session_id: SESSION_ID } })
    expect(stripe.paymentIntents.retrieve).not.toHaveBeenCalled()
  })

  it("fails with Stripe's error", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.retrieve.mockRejectedValue(new Error("boom"))
    await expect(provider.updatePayment({ amount: 25, currency_code: "usd", data: session })).rejects.toThrow("boom")
  })
})

describe("StripeBase.getPaymentStatus and retrievePayment", () => {
  it("reads the status from Stripe", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.retrieve.mockResolvedValue(intent({ status: "requires_capture" }))

    const output = await provider.getPaymentStatus({ data: session })

    expect(output.status).toBe(PaymentSessionStatus.AUTHORIZED)
    expect(output.data.client_secret).toBeNull()
  })

  it("is pending without a PaymentIntent", async () => {
    const { provider } = makeProvider()
    expect((await provider.getPaymentStatus({ data: { session_id: SESSION_ID } })).status).toBe(PaymentSessionStatus.PENDING)
  })

  it("keeps amounts in minor units in retrievePayment (regression of D10)", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.retrieve.mockResolvedValue(intent({ amount: 1999 }))

    expect((await provider.retrievePayment({ data: session })).data.amount).toBe(1999)
  })

  it.each(["getPaymentStatus", "retrievePayment"])("%s fails with Stripe's error", async (method) => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.retrieve.mockRejectedValue(new Error("boom"))
    await expect(provider[method]({ data: session })).rejects.toThrow("boom")
  })

  it("retrievePayment needs the PaymentIntent", async () => {
    const { provider } = makeProvider()
    await expect(provider.retrievePayment({ data: {} })).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
  })
})

describe("StripeBase registration", () => {
  it("is the stripe provider, so Medusa registers it as pp_stripe_<id>", () => {
    expect(StripeService.identifier).toBe("stripe")
  })

  it("reports plugin.started when Medusa validates the options", () => {
    expect(() => StripeService.validateOptions({})).not.toThrow()
  })

  it("ignores a webhook without a body", async () => {
    const { provider } = makeProvider()
    expect(await provider.getWebhookActionAndData({ data: {}, rawData: "", headers: {} })).toEqual({
      action: PaymentActions.NOT_SUPPORTED,
    })
  })
})

import { PaymentActions } from "@medusajs/framework/utils"
import { logged, makeProvider, SESSION_ID, signedWebhook } from "./test-utils"

const intentEvent = (type: string, object: Record<string, unknown> = {}) => ({
  type,
  data: {
    object: {
      id: "pi_1",
      object: "payment_intent",
      amount: 1999,
      amount_capturable: 0,
      amount_received: 0,
      currency: "usd",
      metadata: { session_id: SESSION_ID },
      ...object,
    },
  },
})

describe("StripeBase.getWebhookActionAndData", () => {
  it("authorizes on amount_capturable_updated with the capturable amount", async () => {
    const { provider } = makeProvider()

    const result = await provider.getWebhookActionAndData(
      signedWebhook(intentEvent("payment_intent.amount_capturable_updated", { amount_capturable: 1999 }))
    )

    expect(result).toEqual({ action: PaymentActions.AUTHORIZED, data: { session_id: SESSION_ID, amount: 19.99 } })
  })

  it.each([
    ["usd", 1999, 19.99],
    ["ugx", 500000, 5000],
    ["kwd", 5120, 5.12],
    ["jpy", 500, 500],
  ])("captures on succeeded with the received amount in %s", async (currency, received, amount) => {
    const { provider } = makeProvider()

    const result = await provider.getWebhookActionAndData(
      signedWebhook(intentEvent("payment_intent.succeeded", { currency, amount_received: received }))
    )

    expect(result).toEqual({ action: PaymentActions.SUCCESSFUL, data: { session_id: SESSION_ID, amount } })
  })

  it.each([
    ["payment_intent.payment_failed", PaymentActions.FAILED],
    ["payment_intent.canceled", PaymentActions.CANCELED],
    ["payment_intent.processing", PaymentActions.PENDING],
    ["payment_intent.requires_action", PaymentActions.REQUIRES_MORE],
    ["payment_intent.partially_funded", PaymentActions.REQUIRES_MORE],
  ])("maps %s to %s", async (type, action) => {
    const { provider } = makeProvider()
    expect((await provider.getWebhookActionAndData(signedWebhook(intentEvent(type)))).action).toBe(action)
  })

  it("verifies a body the event bus serialized as { type: 'Buffer' }", async () => {
    const { provider } = makeProvider()
    const request = signedWebhook(intentEvent("payment_intent.succeeded", { amount_received: 1999 }))

    const result = await provider.getWebhookActionAndData({ ...request, rawData: request.rawData.toJSON() })

    expect(result.action).toBe(PaymentActions.SUCCESSFUL)
  })

  it("verifies a string body and a header in another case", async () => {
    const { provider } = makeProvider()
    const request = signedWebhook(intentEvent("payment_intent.succeeded", { amount_received: 1999 }))

    const result = await provider.getWebhookActionAndData({
      data: request.data,
      rawData: request.rawData.toString("utf8"),
      headers: { "Stripe-Signature": [request.headers["stripe-signature"]] },
    })

    expect(result.action).toBe(PaymentActions.SUCCESSFUL)
  })

  it.each([
    ["a wrong secret", () => signedWebhook(intentEvent("payment_intent.succeeded"), { secret: "whsec_other" })],
    [
      "a timestamp outside the tolerance",
      () => signedWebhook(intentEvent("payment_intent.succeeded"), { timestamp: Math.floor(Date.now() / 1000) - 600 }),
    ],
    [
      "a body changed after signing",
      () => {
        const request = signedWebhook(intentEvent("payment_intent.succeeded"))
        return { ...request, rawData: Buffer.from(request.rawData.toString().replace("1999", "1")) }
      },
    ],
    ["no signature header", () => ({ ...signedWebhook(intentEvent("payment_intent.succeeded")), headers: {} })],
    ["no raw body", () => ({ ...signedWebhook(intentEvent("payment_intent.succeeded")), rawData: undefined })],
  ])("ignores an event with %s", async (_, request) => {
    const { provider, logger } = makeProvider()

    expect(await provider.getWebhookActionAndData(request())).toEqual({ action: PaymentActions.NOT_SUPPORTED })
    expect(logger.warn).toHaveBeenCalled()
  })

  it("ignores every event without a signing secret", async () => {
    const { provider, logger } = makeProvider({ webhookSecret: undefined })

    expect(await provider.getWebhookActionAndData(signedWebhook(intentEvent("payment_intent.succeeded")))).toEqual({
      action: PaymentActions.NOT_SUPPORTED,
    })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("no webhook signing key"))
  })

  it("ignores an event without a Medusa payment session", async () => {
    const { provider } = makeProvider()

    const result = await provider.getWebhookActionAndData(signedWebhook(intentEvent("payment_intent.succeeded", { metadata: {} })))

    expect(result).toEqual({ action: PaymentActions.NOT_SUPPORTED })
  })

  it.each(["charge.refunded", "refund.failed", "charge.dispute.created"])(
    "logs %s as money moved outside Medusa and ignores it",
    async (type) => {
      const { provider, logger } = makeProvider()

      const result = await provider.getWebhookActionAndData(signedWebhook({ type, data: { object: { id: "ch_1" } } }))

      expect(result).toEqual({ action: PaymentActions.NOT_SUPPORTED })
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("Medusa does not record"))
    }
  )

  it("ignores other events", async () => {
    const { provider } = makeProvider()
    expect(await provider.getWebhookActionAndData(signedWebhook({ type: "customer.created", data: { object: {} } }))).toEqual({
      action: PaymentActions.NOT_SUPPORTED,
    })
  })

  it("never logs the signing secret or the signature", async () => {
    const { provider, logger } = makeProvider()
    const request = signedWebhook(intentEvent("payment_intent.succeeded"))

    await provider.getWebhookActionAndData(request)

    const text = logged(logger)
    expect(text).not.toContain("whsec_123")
    expect(text).not.toContain(request.headers["stripe-signature"])
  })
})

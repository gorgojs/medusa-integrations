import { PaymentActions } from "@medusajs/framework/utils"
import { makeProvider, mollieError, payment, PAYMENT_ID, SESSION_ID } from "./test-utils"

function webhook(body: Record<string, unknown> = { id: PAYMENT_ID }, rawData?: unknown) {
  return { data: body, rawData: rawData ?? Buffer.from(new URLSearchParams(body as Record<string, string>).toString()), headers: {} }
}

describe("getWebhookActionAndData", () => {
  it("M8: completes the cart of a paid payment with the amount as a number", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "paid" }))

    const result = await provider.getWebhookActionAndData(webhook())

    expect(client.payments.get).toHaveBeenCalledWith({ paymentId: PAYMENT_ID })
    expect(result).toEqual({ action: PaymentActions.SUCCESSFUL, data: { session_id: SESSION_ID, amount: 19.99 } })
  })

  it("authorizes the session of an authorized payment", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "authorized" }))
    await expect(provider.getWebhookActionAndData(webhook())).resolves.toEqual({
      action: PaymentActions.AUTHORIZED,
      data: { session_id: SESSION_ID, amount: 19.99 },
    })
  })

  it.each(["open", "pending", "failed", "canceled", "expired"])("leaves a %s payment to the storefront", async (status) => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status }))
    await expect(provider.getWebhookActionAndData(webhook())).resolves.toEqual({ action: PaymentActions.NOT_SUPPORTED })
  })

  it("M10: ignores a payment that names no Medusa session", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "paid", metadata: { order: "1001" } }))
    await expect(provider.getWebhookActionAndData(webhook())).resolves.toEqual({ action: PaymentActions.NOT_SUPPORTED })
  })

  it("never calls Mollie for a body that is not a payment id", async () => {
    const { provider, client } = makeProvider()
    await expect(provider.getWebhookActionAndData(webhook({ id: "re_4qqhO89gsT" }))).resolves.toEqual({
      action: PaymentActions.NOT_SUPPORTED,
    })
    await expect(provider.getWebhookActionAndData({ data: {}, rawData: undefined, headers: {} })).resolves.toEqual({
      action: PaymentActions.NOT_SUPPORTED,
    })
    expect(client.payments.get).not.toHaveBeenCalled()
  })

  it("ignores a payment this account does not have", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockRejectedValue(mollieError(404, "No payment exists with token tr_7UhSN1zuXS."))
    await expect(provider.getWebhookActionAndData(webhook())).resolves.toEqual({ action: PaymentActions.NOT_SUPPORTED })
  })

  it("M9: throws when Mollie cannot answer, so the event bus retries the event", async () => {
    const { provider, client, logger } = makeProvider()
    client.payments.get.mockRejectedValue(mollieError(503, "Service unavailable"))
    await expect(provider.getWebhookActionAndData(webhook())).rejects.toMatchObject({ status: 503 })
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("getWebhookActionAndData failed"))
  })

  it("reads the body the event bus serialized as a Buffer", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "paid" }))
    const serialized = JSON.parse(JSON.stringify(Buffer.from(`id=${PAYMENT_ID}`)))
    await expect(provider.getWebhookActionAndData(webhook({}, serialized))).resolves.toMatchObject({
      action: PaymentActions.SUCCESSFUL,
    })
  })

  it("warns once about a refund that failed after Medusa recorded it", async () => {
    const { provider, client, logger } = makeProvider()
    client.payments.get.mockResolvedValue(
      payment({ status: "paid", amountRefunded: { currency: "EUR", value: "10.00" } })
    )
    client.refunds.list.mockResolvedValue({
      result: {
        count: 2,
        embedded: {
          refunds: [
            { id: "re_ok", status: "refunded", amount: { currency: "EUR", value: "5.00" } },
            { id: "re_bad", status: "failed", amount: { currency: "EUR", value: "5.00" } },
          ],
        },
      },
    })

    const result = await provider.getWebhookActionAndData(webhook())

    expect(client.refunds.list).toHaveBeenCalledWith({ paymentId: PAYMENT_ID, limit: 250 })
    const warnings = (logger.warn as jest.Mock).mock.calls.map(([message]) => String(message))
    expect(warnings).toEqual([expect.stringContaining("refund re_bad of 5.00 EUR")])
    expect(result.action).toBe(PaymentActions.SUCCESSFUL)
  })

  describe("a payment whose Medusa session is gone", () => {
    it("refunds what is left of a paid payment, keyed on the payment, and places no order", async () => {
      const { provider, client, logger } = makeProvider()
      provider.paymentSessionExists.mockResolvedValue(false)
      client.payments.get.mockResolvedValue(
        payment({ status: "paid", amountRemaining: { currency: "EUR", value: "19.99" } })
      )
      client.refunds.create.mockResolvedValue({ resource: "refund", id: "re_orphan", status: "pending" })

      const result = await provider.getWebhookActionAndData(webhook())

      expect(provider.paymentSessionExists).toHaveBeenCalledWith(SESSION_ID)
      expect(client.refunds.create).toHaveBeenCalledWith({
        paymentId: PAYMENT_ID,
        idempotencyKey: `${PAYMENT_ID}-orphan-refund`,
        refundRequest: {
          amount: { currency: "EUR", value: "19.99" },
          metadata: { reason: "payment_session_removed", session_id: SESSION_ID },
        },
      })
      expect(result).toEqual({ action: PaymentActions.NOT_SUPPORTED })
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("no longer exists in Medusa"))
    })

    it("refunds only what is left after an earlier refund", async () => {
      const { provider, client } = makeProvider()
      provider.paymentSessionExists.mockResolvedValue(false)
      client.payments.get.mockResolvedValue(
        payment({
          status: "paid",
          amountRefunded: { currency: "EUR", value: "5.00" },
          amountRemaining: { currency: "EUR", value: "14.99" },
        })
      )
      client.refunds.list.mockResolvedValue({ result: { count: 0, embedded: { refunds: [] } } })
      client.refunds.create.mockResolvedValue({ id: "re_orphan", status: "pending" })
      await provider.getWebhookActionAndData(webhook())
      expect(client.refunds.create.mock.calls[0][0].refundRequest.amount).toEqual({ currency: "EUR", value: "14.99" })
    })

    it("does not refund a payment refunded in full already", async () => {
      const { provider, client } = makeProvider()
      provider.paymentSessionExists.mockResolvedValue(false)
      client.payments.get.mockResolvedValue(
        payment({
          status: "paid",
          amountRefunded: { currency: "EUR", value: "19.99" },
          amountRemaining: { currency: "EUR", value: "0.00" },
        })
      )
      client.refunds.list.mockResolvedValue({ result: { count: 0, embedded: { refunds: [] } } })
      await expect(provider.getWebhookActionAndData(webhook())).resolves.toEqual({ action: PaymentActions.NOT_SUPPORTED })
      expect(client.refunds.create).not.toHaveBeenCalled()
    })

    it("releases a held amount instead of refunding", async () => {
      const { provider, client, logger } = makeProvider()
      provider.paymentSessionExists.mockResolvedValue(false)
      client.payments.get.mockResolvedValue(payment({ status: "authorized" }))
      await expect(provider.getWebhookActionAndData(webhook())).resolves.toEqual({ action: PaymentActions.NOT_SUPPORTED })
      expect(client.payments.releaseAuthorization).toHaveBeenCalledWith({
        paymentId: PAYMENT_ID,
        idempotencyKey: `${PAYMENT_ID}-orphan-release`,
      })
      expect(client.refunds.create).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("releases the held amount"))
    })

    it("throws when the refund fails, so the event is retried", async () => {
      const { provider, client } = makeProvider()
      provider.paymentSessionExists.mockResolvedValue(false)
      client.payments.get.mockResolvedValue(payment({ status: "paid", amountRemaining: { currency: "EUR", value: "19.99" } }))
      client.refunds.create.mockRejectedValue(mollieError(503, "Service unavailable"))
      await expect(provider.getWebhookActionAndData(webhook())).rejects.toMatchObject({ status: 503 })
    })

    it("does not check the session of a payment Medusa ignores anyway", async () => {
      const { provider, client } = makeProvider()
      client.payments.get.mockResolvedValue(payment({ status: "open" }))
      await provider.getWebhookActionAndData(webhook())
      expect(provider.paymentSessionExists).not.toHaveBeenCalled()
    })
  })

  it("reads no refunds of a payment with nothing refunded, and survives a failed read", async () => {
    const { provider, client, logger } = makeProvider()
    client.payments.get.mockResolvedValueOnce(payment({ status: "paid", amountRefunded: { currency: "EUR", value: "0.00" } }))
    await provider.getWebhookActionAndData(webhook())
    expect(client.refunds.list).not.toHaveBeenCalled()

    client.payments.get.mockResolvedValueOnce(payment({ status: "paid", amountRefunded: { currency: "EUR", value: "1.00" } }))
    client.refunds.list.mockRejectedValue(mollieError(503, "Service unavailable"))
    await expect(provider.getWebhookActionAndData(webhook())).resolves.toMatchObject({
      action: PaymentActions.SUCCESSFUL,
    })
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining("could not read the refunds"))
  })
})

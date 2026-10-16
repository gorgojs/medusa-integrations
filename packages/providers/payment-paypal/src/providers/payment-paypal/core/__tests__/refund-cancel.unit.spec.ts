import { MedusaError } from "@medusajs/framework/utils"
import { makeProvider, ORDER_ID, paypalError, SESSION_ID, withPayments } from "./test-utils"

const captured = {
  session_id: SESSION_ID,
  paypal_order_id: ORDER_ID,
  currency_code: "EUR",
  capture_id: "CAP-1",
  capture_status: "COMPLETED",
}

describe("PayPalBase.refundPayment", () => {
  it("always sends the amount, with the refund id as request id", async () => {
    const { provider, client } = makeProvider()
    client.refundCapture.mockResolvedValue({ id: "REF-1", status: "COMPLETED" })

    const output = await provider.refundPayment({ amount: 4, data: captured, context: { idempotency_key: "ref_1" } })

    expect(client.refundCapture).toHaveBeenCalledWith(
      "CAP-1",
      { amount: { currency_code: "EUR", value: "4.00" } },
      "ref_1"
    )
    expect(output.data.refunds).toEqual([{ id: "REF-1", status: "COMPLETED", amount: "4.00" }])
  })

  it("keeps two partial refunds apart: different keys, both recorded", async () => {
    const { provider, client } = makeProvider()
    client.refundCapture
      .mockResolvedValueOnce({ id: "REF-1", status: "COMPLETED" })
      .mockResolvedValueOnce({ id: "REF-2", status: "PENDING" })

    const first = await provider.refundPayment({ amount: 3, data: captured, context: { idempotency_key: "ref_1" } })
    const second = await provider.refundPayment({ amount: 3, data: first.data, context: { idempotency_key: "ref_2" } })

    expect(client.refundCapture.mock.calls.map((call) => call[2])).toEqual(["ref_1", "ref_2"])
    expect(second.data.refunds).toEqual([
      { id: "REF-1", status: "COMPLETED", amount: "3.00" },
      { id: "REF-2", status: "PENDING", amount: "3.00" },
    ])
  })

  it.each([[0], ["0.001"]])("never sends an empty or zero refund, which would refund everything (%p)", async (amount) => {
    const { provider, client } = makeProvider()

    await expect(provider.refundPayment({ amount, data: captured })).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
    expect(client.refundCapture).not.toHaveBeenCalled()
  })

  it.each(["FAILED", "CANCELLED"])("fails when PayPal reports the refund %s", async (status) => {
    const { provider, client } = makeProvider()
    client.refundCapture.mockResolvedValue({ id: "REF-1", status })

    await expect(provider.refundPayment({ amount: 4, data: captured })).rejects.toThrow(`ended as ${status}`)
  })

  it("needs a capture", async () => {
    const { provider } = makeProvider()

    await expect(
      provider.refundPayment({ amount: 4, data: { session_id: SESSION_ID, currency_code: "EUR" } })
    ).rejects.toThrow("no capture to refund")
  })
})

describe("PayPalBase.cancelPayment", () => {
  const authorized = {
    session_id: SESSION_ID,
    paypal_order_id: ORDER_ID,
    authorization_id: "AUTH-1",
    authorization_status: "CREATED",
  }

  it("voids the authorization", async () => {
    const { provider, client } = makeProvider()
    client.voidAuthorization.mockResolvedValue({ id: "AUTH-1", status: "VOIDED" })

    const output = await provider.cancelPayment({ data: authorized, context: { idempotency_key: "pay_1" } })

    expect(client.voidAuthorization).toHaveBeenCalledWith("AUTH-1", "pay_1")
    expect(output.data.authorization_status).toBe("VOIDED")
  })

  it("refuses to cancel a captured payment instead of refunding it in full", async () => {
    const { provider, client } = makeProvider()

    await expect(provider.cancelPayment({ data: captured })).rejects.toMatchObject({
      type: MedusaError.Types.NOT_ALLOWED,
    })
    expect(client.voidAuthorization).not.toHaveBeenCalled()
    expect(client.refundCapture).not.toHaveBeenCalled()
  })

  it("does nothing for an order that was never authorized", async () => {
    const { provider, client } = makeProvider()
    const data = { session_id: SESSION_ID, paypal_order_id: ORDER_ID }

    await expect(provider.cancelPayment({ data })).resolves.toEqual({ data })
    expect(client.voidAuthorization).not.toHaveBeenCalled()
  })

  it("treats a 422 on an authorization that is already voided as success", async () => {
    const { provider, client } = makeProvider()
    client.voidAuthorization.mockRejectedValue(paypalError("voidAuthorization", 422, { name: "UNPROCESSABLE_ENTITY" }))
    client.getOrder.mockResolvedValue(withPayments({ authorizations: [{ id: "AUTH-1", status: "VOIDED" }] }))

    await expect(provider.cancelPayment({ data: authorized })).resolves.toMatchObject({
      data: { authorization_status: "VOIDED" },
    })
  })

  it("rethrows a 422 when the authorization is not voided", async () => {
    const { provider, client } = makeProvider()
    client.voidAuthorization.mockRejectedValue(
      paypalError("voidAuthorization", 422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "PREVIOUSLY_CAPTURED" }] })
    )
    client.getOrder.mockResolvedValue(withPayments({ authorizations: [{ id: "AUTH-1", status: "CAPTURED" }] }))

    await expect(provider.cancelPayment({ data: authorized })).rejects.toThrow("PREVIOUSLY_CAPTURED")
  })
})

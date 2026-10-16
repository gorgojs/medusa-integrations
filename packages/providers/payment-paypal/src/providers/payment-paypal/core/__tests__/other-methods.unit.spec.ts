import { MedusaError, PaymentSessionStatus } from "@medusajs/framework/utils"
import { COLLECTION_ID, makeProvider, order, ORDER_ID, SESSION_ID, withPayments } from "./test-utils"

const session = { session_id: SESSION_ID, paypal_order_id: ORDER_ID, currency_code: "EUR" }

describe("PayPalBase.deletePayment", () => {
  it("makes no PayPal call, so the next session can reuse the order", async () => {
    const { provider, client } = makeProvider()

    await expect(provider.deletePayment({ data: session })).resolves.toEqual({ data: session })
    for (const method of Object.values(client)) {
      expect(method).not.toHaveBeenCalled()
    }
  })
})

describe("PayPalBase.updatePayment", () => {
  it.each(["CREATED", "PAYER_ACTION_REQUIRED"])("patches the amount of a %s order", async (status) => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status }))

    const output = await provider.updatePayment({ amount: 15, currency_code: "eur", data: session })

    expect(client.patchOrder).toHaveBeenCalledWith(ORDER_ID, [
      {
        op: "replace",
        path: `/purchase_units/@reference_id=='${COLLECTION_ID}'/amount`,
        value: { currency_code: "EUR", value: "15.00" },
      },
    ])
    expect(output.data).toMatchObject({ amount: "15.00", currency_code: "EUR" })
  })

  it("lowers the amount of an approved order but never raises it", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "APPROVED" }))

    await provider.updatePayment({ amount: 8, currency_code: "EUR", data: session })
    expect(client.patchOrder.mock.calls[0][1][0].value).toEqual({ currency_code: "EUR", value: "8.00" })

    client.patchOrder.mockClear()
    await expect(provider.updatePayment({ amount: 15, currency_code: "EUR", data: session })).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
    expect(client.patchOrder).not.toHaveBeenCalled()
  })

  it("leaves a completed order alone", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "COMPLETED" }))

    await expect(provider.updatePayment({ amount: 15, currency_code: "EUR", data: session })).resolves.toEqual({
      data: session,
    })
    expect(client.patchOrder).not.toHaveBeenCalled()
  })

  it("does nothing before an order exists", async () => {
    const { provider, client } = makeProvider()
    const data = { session_id: SESSION_ID }

    await expect(provider.updatePayment({ amount: 15, currency_code: "EUR", data })).resolves.toEqual({ data })
    expect(client.getOrder).not.toHaveBeenCalled()
  })
})

describe("PayPalBase.getPaymentStatus and retrievePayment", () => {
  it("maps the order to a Medusa status", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(withPayments({ captures: [{ id: "CAP-1", status: "COMPLETED" }] }))

    const output = await provider.getPaymentStatus({ data: session })

    expect(output.status).toBe(PaymentSessionStatus.CAPTURED)
    expect(output.data.capture_id).toBe("CAP-1")
  })

  it("is pending before an order exists", async () => {
    const { provider, client } = makeProvider()

    await expect(provider.getPaymentStatus({ data: { session_id: SESSION_ID } })).resolves.toMatchObject({
      status: PaymentSessionStatus.PENDING,
    })
    expect(client.getOrder).not.toHaveBeenCalled()
  })

  it("retrieves the order into the session data", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(withPayments({ authorizations: [{ id: "AUTH-1", status: "CREATED" }] }))

    const output = await provider.retrievePayment({ data: session })

    expect(client.getOrder).toHaveBeenCalledWith(ORDER_ID)
    expect(output.data).toMatchObject({ authorization_id: "AUTH-1", status: "COMPLETED" })
  })
})

describe("PayPalBase logging", () => {
  it("logs debug on entry and exit of a method, without the client secret", async () => {
    const { provider, client, logger } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "APPROVED" }))
    client.captureOrder.mockResolvedValue(withPayments({ captures: [{ id: "CAP-1", status: "COMPLETED" }] }))

    await provider.authorizePayment({ data: session, context: { idempotency_key: SESSION_ID } })

    const messages = logger.debug.mock.calls.map((call: unknown[]) => String(call[0]))
    expect(messages.some((m: string) => m.startsWith("PayPalBase.authorizePayment input:"))).toBe(true)
    expect(messages.some((m: string) => m.startsWith("PayPalBase.authorizePayment output:"))).toBe(true)
    expect(messages.join("\n")).not.toContain("client-secret")
  })
})

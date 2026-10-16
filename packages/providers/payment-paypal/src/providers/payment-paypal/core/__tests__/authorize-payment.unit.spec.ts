import { PaymentSessionStatus } from "@medusajs/framework/utils"
import { makeProvider, order, ORDER_ID, paypalError, SESSION_ID, withPayments } from "./test-utils"

const session = { session_id: SESSION_ID, paypal_order_id: ORDER_ID, currency_code: "EUR" }
const input = { data: session, context: { idempotency_key: SESSION_ID } }

describe("PayPalBase.authorizePayment", () => {
  it("captures an approved CAPTURE order and keeps the capture id", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "APPROVED" }))
    client.captureOrder.mockResolvedValue(withPayments({ captures: [{ id: "CAP-1", status: "COMPLETED" }] }))

    const output = await provider.authorizePayment(input)

    expect(client.captureOrder).toHaveBeenCalledWith(ORDER_ID, `${SESSION_ID}-capture`)
    expect(output.status).toBe(PaymentSessionStatus.CAPTURED)
    expect(output.data).toMatchObject({ capture_id: "CAP-1", capture_status: "COMPLETED", status: "COMPLETED" })
  })

  it("returns authorized for a pending capture, so the cart completes and the webhook finishes it", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "APPROVED" }))
    client.captureOrder.mockResolvedValue(withPayments({ captures: [{ id: "CAP-1", status: "PENDING" }] }))

    const output = await provider.authorizePayment(input)

    expect(output.status).toBe(PaymentSessionStatus.AUTHORIZED)
    expect(output.data.capture_id).toBe("CAP-1")
  })

  it("returns error with the decline when the capture comes back DECLINED", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "APPROVED" }))
    client.captureOrder.mockResolvedValue(
      withPayments({
        captures: [{ id: "CAP-1", status: "DECLINED", processor_response: { response_code: "5120" } }],
      })
    )

    const output = await provider.authorizePayment(input)

    expect(output.status).toBe(PaymentSessionStatus.ERROR)
    expect(output.data.decline).toMatchObject({ code: "5120", retryable: true })
  })

  it("returns error with the decline when PayPal refuses the capture with INSTRUMENT_DECLINED", async () => {
    const { provider, client, logger } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "APPROVED" }))
    client.captureOrder.mockRejectedValue(
      paypalError("captureOrder", 422, {
        name: "UNPROCESSABLE_ENTITY",
        details: [{ issue: "INSTRUMENT_DECLINED" }],
      })
    )

    const output = await provider.authorizePayment(input)

    expect(output.status).toBe(PaymentSessionStatus.ERROR)
    expect(output.data.decline).toMatchObject({ code: "INSTRUMENT_DECLINED" })
    expect(logger.warn).toHaveBeenCalled()
  })

  it("rethrows a PayPal failure that is not a decline", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "APPROVED" }))
    client.captureOrder.mockRejectedValue(paypalError("captureOrder", 500, { name: "INTERNAL_SERVER_ERROR" }))

    await expect(provider.authorizePayment(input)).rejects.toThrow("INTERNAL_SERVER_ERROR")
  })

  it("authorizes an approved AUTHORIZE order and keeps the authorization id", async () => {
    const { provider, client } = makeProvider({ intent: "authorize" })
    client.getOrder.mockResolvedValue(order({ status: "APPROVED", intent: "AUTHORIZE" }))
    client.authorizeOrder.mockResolvedValue(
      withPayments({ authorizations: [{ id: "AUTH-1", status: "CREATED" }] }, { intent: "AUTHORIZE" })
    )

    const output = await provider.authorizePayment(input)

    expect(client.authorizeOrder).toHaveBeenCalledWith(ORDER_ID, `${SESSION_ID}-authorize`)
    expect(client.captureOrder).not.toHaveBeenCalled()
    expect(output.status).toBe(PaymentSessionStatus.AUTHORIZED)
    expect(output.data).toMatchObject({ authorization_id: "AUTH-1", authorization_status: "CREATED" })
  })

  it("reads the result of a completed order without calling PayPal again", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(withPayments({ captures: [{ id: "CAP-1", status: "COMPLETED" }] }))

    const output = await provider.authorizePayment(input)

    expect(client.captureOrder).not.toHaveBeenCalled()
    expect(output.status).toBe(PaymentSessionStatus.CAPTURED)
    expect(output.data.capture_id).toBe("CAP-1")
  })

  it.each(["CREATED", "PAYER_ACTION_REQUIRED"])("returns requires_more while the order is %s", async (status) => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status }))

    const output = await provider.authorizePayment(input)

    expect(output.status).toBe(PaymentSessionStatus.REQUIRES_MORE)
    expect(client.captureOrder).not.toHaveBeenCalled()
  })

  it("returns canceled for a voided order", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "VOIDED" }))

    await expect(provider.authorizePayment(input)).resolves.toMatchObject({ status: PaymentSessionStatus.CANCELED })
  })

  it("needs the PayPal order id", async () => {
    const { provider } = makeProvider()

    await expect(provider.authorizePayment({ data: { session_id: SESSION_ID } })).rejects.toThrow(
      "data.paypal_order_id"
    )
  })
})

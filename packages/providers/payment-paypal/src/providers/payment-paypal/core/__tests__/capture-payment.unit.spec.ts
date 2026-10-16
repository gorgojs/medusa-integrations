import { makeProvider, ORDER_ID, paypalError, SESSION_ID, withPayments } from "./test-utils"

const authorized = {
  session_id: SESSION_ID,
  paypal_order_id: ORDER_ID,
  currency_code: "EUR",
  authorization_id: "AUTH-1",
  authorization_status: "CREATED",
}

describe("PayPalBase.capturePayment", () => {
  it("captures the whole authorization with final_capture and the Capture id as request id", async () => {
    const { provider, client } = makeProvider({ intent: "authorize" })
    client.captureAuthorization.mockResolvedValue({ id: "CAP-1", status: "COMPLETED" })

    const output = await provider.capturePayment({ data: authorized, context: { idempotency_key: "capt_1" } })

    expect(client.captureAuthorization).toHaveBeenCalledWith("AUTH-1", { final_capture: true }, "capt_1")
    // no amount: the capture is always full, as with the official Stripe provider
    expect(client.captureAuthorization.mock.calls[0][1]).not.toHaveProperty("amount")
    expect(output.data).toMatchObject({ capture_id: "CAP-1", capture_status: "COMPLETED" })
  })

  it("makes no PayPal call when the payment already has a capture", async () => {
    const { provider, client } = makeProvider()
    const data = { ...authorized, capture_id: "CAP-1", capture_status: "COMPLETED" }

    await expect(provider.capturePayment({ data, context: { idempotency_key: "capt_1" } })).resolves.toEqual({ data })
    expect(client.captureAuthorization).not.toHaveBeenCalled()
    expect(client.getOrder).not.toHaveBeenCalled()
  })

  it("treats a 422 on an authorization that is already captured as success", async () => {
    const { provider, client } = makeProvider({ intent: "authorize" })
    client.captureAuthorization.mockRejectedValue(
      paypalError("captureAuthorization", 422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "SOME_ISSUE" }] })
    )
    client.getOrder.mockResolvedValue(
      withPayments({
        authorizations: [{ id: "AUTH-1", status: "CAPTURED" }],
        captures: [{ id: "CAP-1", status: "COMPLETED" }],
      })
    )

    const output = await provider.capturePayment({ data: authorized, context: { idempotency_key: "capt_2" } })

    expect(output.data).toMatchObject({ capture_id: "CAP-1", authorization_status: "CAPTURED" })
  })

  it("rethrows a 422 when the order shows no completed capture", async () => {
    const { provider, client } = makeProvider({ intent: "authorize" })
    client.captureAuthorization.mockRejectedValue(
      paypalError("captureAuthorization", 422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "AUTHORIZATION_EXPIRED" }] })
    )
    client.getOrder.mockResolvedValue(withPayments({ authorizations: [{ id: "AUTH-1", status: "EXPIRED" }] }))

    await expect(provider.capturePayment({ data: authorized, context: { idempotency_key: "capt_3" } })).rejects.toThrow(
      "AUTHORIZATION_EXPIRED"
    )
  })

  it("refuses a declined capture so Medusa does not record it", async () => {
    const { provider, client } = makeProvider({ intent: "authorize" })
    client.captureAuthorization.mockResolvedValue({
      id: "CAP-1",
      status: "DECLINED",
      processor_response: { response_code: "5120" },
    })

    await expect(provider.capturePayment({ data: authorized })).rejects.toThrow("insufficient funds")
  })

  it("finds a capture the session does not know about yet on the order", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(withPayments({ captures: [{ id: "CAP-9", status: "COMPLETED" }] }))

    const output = await provider.capturePayment({ data: { session_id: SESSION_ID, paypal_order_id: ORDER_ID } })

    expect(output.data.capture_id).toBe("CAP-9")
    expect(client.captureAuthorization).not.toHaveBeenCalled()
  })

  it("fails when there is nothing to capture", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(withPayments({}, { status: "APPROVED" }))

    await expect(
      provider.capturePayment({ data: { session_id: SESSION_ID, paypal_order_id: ORDER_ID } })
    ).rejects.toThrow("no authorization to capture")
  })
})

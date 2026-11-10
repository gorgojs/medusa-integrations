import { MedusaError, PaymentSessionStatus } from "@medusajs/framework/utils"
import { makeProvider, paidData, payment, PAYMENT_ID, SESSION_ID, sessionData } from "./test-utils"

describe("updatePayment", () => {
  it("keeps the payment when the amount and the currency did not change", async () => {
    const { provider, client } = makeProvider()
    const data = sessionData()
    const output = await provider.updatePayment({ amount: "19.990", currency_code: "EUR", data })
    expect(output).toEqual({ data })
    expect(client.payments.create).not.toHaveBeenCalled()
  })

  it("M7: replaces the payment when the amount changed, Mollie cannot change it", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "open" }))
    client.payments.cancel.mockResolvedValue(payment({ status: "canceled" }))
    client.payments.create.mockResolvedValue(
      payment({ id: "tr_NewPayment1", amount: { currency: "EUR", value: "24.99" } })
    )

    const output = await provider.updatePayment({
      amount: 24.99,
      currency_code: "eur",
      data: sessionData({ refunds: [{ id: "re_old", status: "refunded", amount: 1 }] }),
    })

    expect(client.payments.cancel).toHaveBeenCalledWith({ paymentId: PAYMENT_ID })
    expect(client.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: `${SESSION_ID}:24.99:EUR` })
    )
    expect(client.payments.create.mock.calls[0][0].paymentRequest.amount).toEqual({ currency: "EUR", value: "24.99" })
    expect(output).toMatchObject({
      status: PaymentSessionStatus.PENDING,
      // null, not absent: Medusa merges data, and an absent key would keep the old refunds
      data: { id: "tr_NewPayment1", amount: 24.99, session_id: SESSION_ID, refunds: null, captures: null },
    })
  })

  it("needs the return URL to create the new payment", async () => {
    const { provider, client } = makeProvider()
    await expect(
      provider.updatePayment({ amount: 5, currency_code: "eur", data: sessionData({ redirect_url: undefined }) })
    ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
    expect(client.payments.create).not.toHaveBeenCalled()
  })

  it("has nothing to update before a payment exists", async () => {
    const { provider, client } = makeProvider()
    const output = await provider.updatePayment({ amount: 5, currency_code: "eur", data: { session_id: SESSION_ID } })
    expect(output).toEqual({ data: { session_id: SESSION_ID } })
    expect(client.payments.get).not.toHaveBeenCalled()
  })
})

describe("getPaymentStatus", () => {
  it("reads the status from Mollie", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "paid" }))
    const output = await provider.getPaymentStatus({ data: sessionData() })
    expect(output).toEqual({ status: PaymentSessionStatus.CAPTURED, data: paidData() })
  })

  it("is pending before a payment exists", async () => {
    const { provider, client } = makeProvider()
    const output = await provider.getPaymentStatus({ data: { session_id: SESSION_ID } })
    expect(output.status).toBe(PaymentSessionStatus.PENDING)
    expect(client.payments.get).not.toHaveBeenCalled()
  })
})

describe("retrievePayment", () => {
  it("refreshes the data from Mollie", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "paid" }))
    await expect(provider.retrievePayment({ data: sessionData() })).resolves.toEqual({ data: paidData() })
  })

  it("needs the Mollie payment id", async () => {
    const { provider } = makeProvider()
    await expect(provider.retrievePayment({ data: {} })).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
  })
})

describe("idempotency keys", () => {
  it("M12: every POST to Mollie carries one", async () => {
    const { provider, client } = makeProvider()
    client.payments.create.mockResolvedValue(payment())
    await provider.initiatePayment({
      amount: 10,
      currency_code: "eur",
      data: { session_id: SESSION_ID, redirect_url: "https://shop.example.com/return" },
    })

    client.payments.get.mockResolvedValue(payment({ status: "authorized" }))
    client.captures.create.mockResolvedValue({ id: "cpt_1", status: "pending" })
    await provider.capturePayment({ data: sessionData() })

    client.payments.get.mockResolvedValue(payment({ status: "paid" }))
    client.refunds.create.mockResolvedValue({ id: "re_1", status: "pending" })
    await provider.refundPayment({ data: paidData(), amount: 1 })

    client.payments.get.mockResolvedValue(payment({ status: "authorized" }))
    await provider.cancelPayment({ data: sessionData() })

    for (const call of [
      client.payments.create.mock.calls[0][0],
      client.captures.create.mock.calls[0][0],
      client.refunds.create.mock.calls[0][0],
      client.payments.releaseAuthorization.mock.calls[0][0],
    ]) {
      expect(call.idempotencyKey).toEqual(expect.any(String))
    }
  })
})

import { MedusaError } from "@medusajs/framework/utils"
import { MollieApiError } from "../../../../lib/mollie-client"
import { makeProvider, mollieError, paidData, payment, PAYMENT_ID, SESSION_ID, sessionData } from "./test-utils"

describe("capturePayment", () => {
  it("captures the whole authorization, keyed on Medusa's capture", async () => {
    const { provider, client, logger } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "authorized", captureMode: "manual" }))
    client.captures.create.mockResolvedValue({ resource: "capture", id: "cpt_mNepDkEtco6ah3QNPUGYH", status: "pending" })

    const output = await provider.capturePayment({
      data: sessionData({ status: "authorized" }),
      context: { idempotency_key: "capt_01JBTEST" },
    })

    expect(client.captures.create).toHaveBeenCalledWith({ paymentId: PAYMENT_ID, idempotencyKey: "capt_01JBTEST" })
    expect(output.data.captures).toEqual([
      { id: "cpt_mNepDkEtco6ah3QNPUGYH", status: "pending", idempotency_key: "capt_01JBTEST" },
    ])
    expect(output.data.id).toBe(PAYMENT_ID)
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("capture cpt_mNepDkEtco6ah3QNPUGYH"))
  })

  it("M3: does not capture a paid payment again", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "paid" }))
    const output = await provider.capturePayment({ data: paidData(), context: { idempotency_key: "capt_2" } })
    expect(client.captures.create).not.toHaveBeenCalled()
    expect(output.data.status).toBe("paid")
  })

  it("refuses a payment that is not authorized", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "open" }))
    await expect(provider.capturePayment({ data: sessionData() })).rejects.toMatchObject({
      type: MedusaError.Types.NOT_ALLOWED,
      message: `Mollie payment ${PAYMENT_ID} is open and cannot be captured`,
    })
    expect(client.captures.create).not.toHaveBeenCalled()
  })
})

describe("refundPayment", () => {
  it("M1: refunds the amount Medusa asks for, not the payment's", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "paid", amount: { currency: "EUR", value: "50.00" } }))
    client.refunds.create.mockResolvedValue({ resource: "refund", id: "re_4qqhO89gsT", status: "pending" })

    const output = await provider.refundPayment({
      data: paidData({ amount: 50 }),
      amount: 5,
      context: { idempotency_key: "ref_01JBTEST" },
    })

    expect(client.refunds.create).toHaveBeenCalledWith({
      paymentId: PAYMENT_ID,
      idempotencyKey: "ref_01JBTEST",
      refundRequest: {
        amount: { currency: "EUR", value: "5.00" },
        metadata: { medusa_refund_key: "ref_01JBTEST", session_id: SESSION_ID },
      },
    })
    expect(output.data.refunds).toEqual([
      { id: "re_4qqhO89gsT", status: "pending", amount: 5, idempotency_key: "ref_01JBTEST" },
    ])
  })

  it("M2: keeps the payment id through two partial refunds", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "paid" }))
    client.refunds.create
      .mockResolvedValueOnce({ resource: "refund", id: "re_1", status: "pending" })
      .mockResolvedValueOnce({ resource: "refund", id: "re_2", status: "queued" })

    const first = await provider.refundPayment({ data: paidData(), amount: 5, context: { idempotency_key: "ref_1" } })
    const second = await provider.refundPayment({ data: first.data, amount: 4.99, context: { idempotency_key: "ref_2" } })

    expect(second.data.id).toBe(PAYMENT_ID)
    expect(second.data.refunds).toEqual([
      { id: "re_1", status: "pending", amount: 5, idempotency_key: "ref_1" },
      { id: "re_2", status: "queued", amount: 4.99, idempotency_key: "ref_2" },
    ])
    expect(client.payments.get).toHaveBeenNthCalledWith(2, { paymentId: PAYMENT_ID })
  })

  it("does not refund twice for the same Medusa refund", async () => {
    const { provider, client } = makeProvider()
    const data = paidData({ refunds: [{ id: "re_1", status: "pending", amount: 5, idempotency_key: "ref_1" }] })
    const output = await provider.refundPayment({ data, amount: 5, context: { idempotency_key: "ref_1" } })
    expect(client.refunds.create).not.toHaveBeenCalled()
    expect(output.data).toBe(data)
  })

  it("formats the refund in the payment's currency", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "paid", amount: { currency: "JPY", value: "5000" } }))
    client.refunds.create.mockResolvedValue({ resource: "refund", id: "re_1", status: "pending" })
    await provider.refundPayment({ data: paidData({ currency_code: "jpy" }), amount: 1200, context: { idempotency_key: "r" } })
    expect(client.refunds.create.mock.calls[0][0].refundRequest.amount).toEqual({ currency: "JPY", value: "1200" })
  })

  it("refuses a payment that is not paid", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "authorized" }))
    await expect(provider.refundPayment({ data: sessionData(), amount: 5 })).rejects.toMatchObject({
      type: MedusaError.Types.NOT_ALLOWED,
    })
    expect(client.refunds.create).not.toHaveBeenCalled()
  })

  it("warns about a refund Mollie refused at once, and hands back Mollie's errors", async () => {
    const { provider, client, logger } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "paid" }))
    client.refunds.create.mockResolvedValueOnce({ resource: "refund", id: "re_1", status: "failed" })
    await provider.refundPayment({ data: paidData(), amount: 1, context: { idempotency_key: "r1" } })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("came back failed"))

    client.refunds.create.mockRejectedValueOnce(mollieError(422, "The amount is higher than the refundable amount"))
    await expect(
      provider.refundPayment({ data: paidData(), amount: 100, context: { idempotency_key: "r2" } })
    ).rejects.toBeInstanceOf(MollieApiError)
  })
})

describe("cancelPayment", () => {
  it("cancels an open payment", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "open" }))
    client.payments.cancel.mockResolvedValue(payment({ status: "canceled", isCancelable: false }))
    const output = await provider.cancelPayment({ data: sessionData() })
    expect(client.payments.cancel).toHaveBeenCalledWith({ paymentId: PAYMENT_ID })
    expect(output.data).toMatchObject({ status: "canceled", checkout_url: null })
  })

  it("M5: releases an authorization instead of only logging", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "authorized" }))
    client.payments.releaseAuthorization.mockResolvedValue(undefined)
    const output = await provider.cancelPayment({ data: sessionData({ status: "authorized" }), context: { idempotency_key: "pay_1" } })
    expect(client.payments.releaseAuthorization).toHaveBeenCalledWith({ paymentId: PAYMENT_ID, idempotencyKey: "pay_1" })
    expect(output.data.release_requested_at).toEqual(expect.any(String))
  })

  it("M5: hands back Mollie's refusal to release an authorization", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "authorized" }))
    client.payments.releaseAuthorization.mockRejectedValue(mollieError(422, "The authorization cannot be released"))
    await expect(provider.cancelPayment({ data: sessionData() })).rejects.toBeInstanceOf(MollieApiError)
  })

  it("leaves an open payment Mollie refuses to cancel, which the sandbox does (422)", async () => {
    const { provider, client, logger } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "open" }))
    client.payments.cancel.mockRejectedValue(mollieError(422, "The payment cannot be cancelled"))
    const output = await provider.cancelPayment({ data: sessionData() })
    expect(output.data).toMatchObject({ id: PAYMENT_ID, status: "open" })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("until it expires"))
  })

  it("hands back any other failure to cancel an open payment", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "open" }))
    client.payments.cancel.mockRejectedValue(mollieError(503, "Service unavailable"))
    await expect(provider.cancelPayment({ data: sessionData() })).rejects.toBeInstanceOf(MollieApiError)
  })

  it("refuses a paid payment: it is refunded, not canceled", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "paid" }))
    await expect(provider.cancelPayment({ data: paidData() })).rejects.toMatchObject({
      type: MedusaError.Types.NOT_ALLOWED,
      message: "A paid Mollie payment cannot be canceled. Refund it instead.",
    })
  })

  it("refuses a pending payment Mollie cannot cancel", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "pending", isCancelable: false }))
    await expect(provider.cancelPayment({ data: sessionData() })).rejects.toMatchObject({
      type: MedusaError.Types.NOT_ALLOWED,
    })
    expect(client.payments.cancel).not.toHaveBeenCalled()
  })

  it.each(["canceled", "expired", "failed"])("leaves a %s payment as it is", async (status) => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status }))
    const output = await provider.cancelPayment({ data: sessionData() })
    expect(client.payments.cancel).not.toHaveBeenCalled()
    expect(client.payments.releaseAuthorization).not.toHaveBeenCalled()
    expect(output.data.status).toBe(status)
  })

  it("has nothing to cancel without a Mollie payment", async () => {
    const { provider, client } = makeProvider()
    const output = await provider.cancelPayment({ data: { session_id: SESSION_ID } })
    expect(client.payments.get).not.toHaveBeenCalled()
    expect(output.data).toEqual({ session_id: SESSION_ID })
  })
})

describe("deletePayment", () => {
  it("cancels the open payment, so its checkout link cannot be paid", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "open" }))
    client.payments.cancel.mockResolvedValue(payment({ status: "canceled" }))
    const output = await provider.deletePayment({ data: sessionData() })
    expect(client.payments.cancel).toHaveBeenCalledWith({ paymentId: PAYMENT_ID })
    expect(output.data.status).toBe("canceled")
  })

  it("never throws because of Mollie", async () => {
    const { provider, client, logger } = makeProvider()
    client.payments.get.mockRejectedValue(mollieError(503, "Service unavailable"))
    const data = sessionData()
    await expect(provider.deletePayment({ data })).resolves.toEqual({ data })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`could not cancel Mollie payment ${PAYMENT_ID}`))
  })

  it("leaves a paid payment alone", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "paid" }))
    await provider.deletePayment({ data: paidData() })
    expect(client.payments.cancel).not.toHaveBeenCalled()
  })

  it("has nothing to delete without a Mollie payment", async () => {
    const { provider, client } = makeProvider()
    await provider.deletePayment({ data: { session_id: SESSION_ID } })
    expect(client.payments.get).not.toHaveBeenCalled()
  })
})

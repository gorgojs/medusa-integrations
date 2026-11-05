import { MedusaError } from "@medusajs/framework/utils"
import {
  approved,
  details,
  gatewayError,
  makeProvider,
  OPAQUE_DATA,
  paymentData,
  sent,
  sessionData,
  TRANS_ID,
  VENDOR_DATA,
} from "./test-utils"

describe("capturePayment", () => {
  it("captures the whole authorization without an amount", async () => {
    const { provider, client, logger } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("authorizedPendingCapture"))
    client.createTransaction.mockResolvedValue(approved())

    const output = await provider.capturePayment({
      data: paymentData({ transactionStatus: "authorizedPendingCapture" }),
      context: { idempotency_key: "capt_01JBTEST" },
    })

    const { request, refId } = sent(client)
    expect(request).toEqual({ transactionType: "priorAuthCaptureTransaction", refTransId: TRANS_ID })
    expect(refId).toBe("capt_01JBTEST")
    expect(output.data).toMatchObject({ transId: TRANS_ID, transactionStatus: "capturedPendingSettlement" })
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`transaction ${TRANS_ID} captured`))
  })

  it("does not capture a transaction captured already", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("capturedPendingSettlement"))
    const output = await provider.capturePayment({ data: paymentData() })
    expect(client.createTransaction).not.toHaveBeenCalled()
    expect(output.data.transactionStatus).toBe("capturedPendingSettlement")
  })

  it("refuses a transaction held for review", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("FDSAuthorizedPendingReview"))
    await expect(provider.capturePayment({ data: paymentData() })).rejects.toMatchObject({
      type: MedusaError.Types.NOT_ALLOWED,
      message: expect.stringContaining("held for review"),
    })
    expect(client.createTransaction).not.toHaveBeenCalled()
  })

  it("refuses a voided transaction", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("voided"))
    await expect(provider.capturePayment({ data: paymentData() })).rejects.toThrow("is voided and cannot be captured")
  })

  it("accepts a failed capture call when the transaction turns out captured", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails
      .mockResolvedValueOnce(details("authorizedPendingCapture"))
      .mockResolvedValueOnce(details("capturedPendingSettlement"))
    client.createTransaction.mockRejectedValue(gatewayError("311", "This transaction has already been captured."))
    const output = await provider.capturePayment({ data: paymentData() })
    expect(output.data.transactionStatus).toBe("capturedPendingSettlement")
  })

  it("hands back a failed capture when the transaction is still only authorized", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("authorizedPendingCapture"))
    client.createTransaction.mockRejectedValue(gatewayError("16", "The transaction cannot be found."))
    await expect(provider.capturePayment({ data: paymentData() })).rejects.toThrow("The transaction cannot be found.")
  })

  it("needs a transaction id", async () => {
    const { provider } = makeProvider()
    await expect(provider.capturePayment({ data: sessionData() })).rejects.toThrow("needs the transaction id in data.transId")
  })
})

describe("refundPayment after settlement", () => {
  it("refunds to the card's last four digits and keeps the payment's transId (regression В3)", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("settledSuccessfully"))
    client.createTransaction
      .mockResolvedValueOnce(approved({ transId: "70001" }))
      .mockResolvedValueOnce(approved({ transId: "70002" }))

    const first = await provider.refundPayment({
      data: paymentData({ transactionStatus: "settledSuccessfully" }),
      amount: 5,
      context: { idempotency_key: "ref_1" },
    })
    const second = await provider.refundPayment({
      data: first.data,
      amount: { value: "2.5", precision: 20 },
      context: { idempotency_key: "ref_2" },
    })

    expect(sent(client, 0)).toEqual({
      request: {
        transactionType: "refundTransaction",
        amount: "5.00",
        currencyCode: "USD",
        payment: { creditCard: { cardNumber: "1111", expirationDate: "XXXX" } },
        refTransId: TRANS_ID,
      },
      refId: "ref_1",
    })
    expect(sent(client, 1).request).toMatchObject({ amount: "2.50", refTransId: TRANS_ID })
    expect(second.data.transId).toBe(TRANS_ID)
    expect(second.data.refunds).toEqual([
      { transId: "70001", amount: 5, idempotency_key: "ref_1" },
      { transId: "70002", amount: 2.5, idempotency_key: "ref_2" },
    ])
  })

  it("does not refund twice for the same Medusa refund", async () => {
    const { provider, client } = makeProvider()
    const data = paymentData({ refunds: [{ transId: "70001", amount: 5, idempotency_key: "ref_1" }] })
    const output = await provider.refundPayment({ data, amount: 5, context: { idempotency_key: "ref_1" } })
    expect(client.createTransaction).not.toHaveBeenCalled()
    expect(output.data.refunds).toHaveLength(1)
  })

  it("hands back a refund the gateway refuses", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("settledSuccessfully"))
    client.createTransaction.mockRejectedValue(gatewayError("55", "The sum of credits against the referenced transaction would exceed original debit amount."))
    await expect(provider.refundPayment({ data: paymentData(), amount: 50 })).rejects.toThrow("would exceed original debit amount")
  })

  it("refuses to refund a transaction with no card number", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("settledSuccessfully", { payment: {} }))
    await expect(
      provider.refundPayment({ data: paymentData({ card_last4: undefined, accountNumber: undefined }), amount: 5 })
    ).rejects.toThrow("has no card number to refund to")
  })
})

describe("refundPayment before settlement", () => {
  it("voids the payment for a refund of the whole amount", async () => {
    const { provider, client, logger } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("capturedPendingSettlement"))
    client.createTransaction.mockResolvedValue(approved())

    const output = await provider.refundPayment({
      data: paymentData(),
      amount: 19.99,
      context: { idempotency_key: "ref_1" },
    })

    expect(sent(client)).toEqual({
      request: { transactionType: "voidTransaction", refTransId: TRANS_ID },
      refId: "ref_1",
    })
    expect(output.data).toMatchObject({
      transId: TRANS_ID,
      transactionStatus: "voided",
      refunds: [{ amount: 19.99, voided: true, idempotency_key: "ref_1" }],
    })
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("void of 19.99 USD"))
  })

  it("refuses a partial refund until settlement", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("capturedPendingSettlement"))
    await expect(provider.refundPayment({ data: paymentData(), amount: 5 })).rejects.toMatchObject({
      type: MedusaError.Types.NOT_ALLOWED,
      message: expect.stringContaining("Authorize.net settles payments once a day"),
    })
    expect(client.createTransaction).not.toHaveBeenCalled()
  })

  it("refuses the rest of a payment refunded in part before", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("capturedPendingSettlement"))
    const data = paymentData({ refunds: [{ transId: "70001", amount: 5 }] })
    await expect(provider.refundPayment({ data, amount: 19.99 })).rejects.toMatchObject({
      type: MedusaError.Types.NOT_ALLOWED,
    })
  })

  it("explains a void the gateway refuses", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("capturedPendingSettlement"))
    client.createTransaction.mockRejectedValue(gatewayError("33", "The transaction cannot be voided."))
    await expect(provider.refundPayment({ data: paymentData(), amount: 19.99 })).rejects.toMatchObject({
      type: MedusaError.Types.NOT_ALLOWED,
      message: expect.stringContaining("refused to void it"),
    })
  })

  it("refuses to refund a payment that was only authorized", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("authorizedPendingCapture"))
    await expect(provider.refundPayment({ data: paymentData(), amount: 5 })).rejects.toThrow(
      "is authorizedPendingCapture and cannot be refunded"
    )
  })
})

describe("cancelPayment", () => {
  it("does nothing for a session that never reached Authorize.net", async () => {
    const { provider, client } = makeProvider()
    const output = await provider.cancelPayment({ data: sessionData() })
    expect(client.getTransactionDetails).not.toHaveBeenCalled()
    expect(output.data.opaque_data).toBeNull()
  })

  it.each(["authorizedPendingCapture", "FDSPendingReview", "FDSAuthorizedPendingReview"])(
    "voids a %s transaction, reading transId from data (regression В4)",
    async (status) => {
      const { provider, client } = makeProvider()
      client.getTransactionDetails.mockResolvedValue(details(status))
      client.createTransaction.mockResolvedValue(approved())

      const output = await provider.cancelPayment({ data: paymentData(), context: { idempotency_key: "pay_1" } })

      expect(sent(client)).toEqual({ request: { transactionType: "voidTransaction", refTransId: TRANS_ID }, refId: "pay_1" })
      expect(output.data.transactionStatus).toBe("voided")
    }
  )

  it("refuses a captured payment", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("settledSuccessfully"))
    await expect(provider.cancelPayment({ data: paymentData() })).rejects.toThrow("Refund it instead.")
  })

  it("leaves a voided or expired transaction alone", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("expired"))
    const output = await provider.cancelPayment({ data: paymentData() })
    expect(client.createTransaction).not.toHaveBeenCalled()
    expect(output.data.transactionStatus).toBe("expired")
  })
})

describe("deletePayment", () => {
  it("only drops the token of a session that never reached Authorize.net", async () => {
    const { provider, client } = makeProvider()
    const output = await provider.deletePayment({ data: sessionData() })
    expect(client.getTransactionDetails).not.toHaveBeenCalled()
    expect(output.data.opaque_data).toBeNull()
  })

  it("voids an authorization behind the session", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("authorizedPendingCapture"))
    client.createTransaction.mockResolvedValue(approved())
    const output = await provider.deletePayment({ data: paymentData() })
    expect(sent(client).request).toEqual({ transactionType: "voidTransaction", refTransId: TRANS_ID })
    expect(output.data.transactionStatus).toBe("voided")
  })

  it("never throws, so the buyer can switch payment methods (regression В4)", async () => {
    const { provider, client, logger } = makeProvider()
    client.getTransactionDetails.mockRejectedValue(new Error("gateway down"))
    const output = await provider.deletePayment({ data: paymentData() })
    expect(output.data.transId).toBe(TRANS_ID)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("could not void transaction 60001"))
  })
})

describe("payments created by the vendor's plugin", () => {
  it("captures one by its transId", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("authorizedPendingCapture"))
    client.createTransaction.mockResolvedValue(approved())
    const output = await provider.capturePayment({ data: VENDOR_DATA })
    expect(sent(client).request.refTransId).toBe(TRANS_ID)
    expect(output.data).toMatchObject({ transId: TRANS_ID, card_last4: "1111" })
  })

  it("refunds one without knowing its currency, leaving it to the account", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("settledSuccessfully"))
    client.createTransaction.mockResolvedValue(approved({ transId: "70001" }))
    await provider.refundPayment({ data: VENDOR_DATA, amount: 5 })
    expect(sent(client).request).not.toHaveProperty("currencyCode")
    expect(sent(client).request).toMatchObject({ amount: "5.00", refTransId: TRANS_ID })
  })

  it("voids one", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("authorizedPendingCapture"))
    client.createTransaction.mockResolvedValue(approved())
    await provider.cancelPayment({ data: VENDOR_DATA })
    expect(sent(client).request).toEqual({ transactionType: "voidTransaction", refTransId: TRANS_ID })
  })

  it("keeps the token out of the data it returns", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("authorizedPendingCapture"))
    client.createTransaction.mockResolvedValue(approved())
    const output = await provider.capturePayment({ data: { ...VENDOR_DATA, opaque_data: OPAQUE_DATA } })
    expect(output.data.opaque_data).toBeNull()
  })
})

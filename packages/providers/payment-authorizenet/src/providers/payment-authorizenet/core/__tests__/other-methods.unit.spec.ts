import { PaymentSessionStatus } from "@medusajs/framework/utils"
import AuthorizeNetService from "../../services/authorizenet"
import { REF_ID_MAX_LENGTH, toRefId } from "../authorizenet-base"
import { details, makeProvider, paymentData, SESSION_ID, sessionData, TRANS_ID } from "./test-utils"

describe("registration", () => {
  it("registers as `authorizenet`, the id the vendor's plugin used", () => {
    expect(AuthorizeNetService.identifier).toBe("authorizenet")
  })

  it("accepts any options at load time: they come from the integration module", () => {
    expect(() => (AuthorizeNetService as any).validateOptions({})).not.toThrow()
  })
})

describe("getPaymentStatus", () => {
  it("is pending until there is a transaction", async () => {
    const { provider, client } = makeProvider()
    const output = await provider.getPaymentStatus({ data: sessionData() })
    expect(output.status).toBe(PaymentSessionStatus.PENDING)
    expect(client.getTransactionDetails).not.toHaveBeenCalled()
  })

  it("reads the transaction's status", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("settledSuccessfully"))
    const output = await provider.getPaymentStatus({ data: paymentData() })
    expect(output).toMatchObject({ status: PaymentSessionStatus.CAPTURED, data: { transactionStatus: "settledSuccessfully" } })
  })

  it("hands back a failed read", async () => {
    const { provider, client, logger } = makeProvider()
    client.getTransactionDetails.mockRejectedValue(new Error("gateway down"))
    await expect(provider.getPaymentStatus({ data: paymentData() })).rejects.toThrow("gateway down")
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("AuthorizeNetBase.getPaymentStatus failed"))
  })

  it("refuses details that carry no status", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue({ messages: { resultCode: "Ok" } })
    await expect(provider.getPaymentStatus({ data: paymentData() })).rejects.toThrow(
      `Authorize.net returned no status for transaction ${TRANS_ID}`
    )
  })
})

describe("retrievePayment", () => {
  it("returns the data refreshed from the transaction", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("settledSuccessfully"))
    const output = await provider.retrievePayment({ data: paymentData() })
    expect(output.data).toMatchObject({ transId: TRANS_ID, transactionStatus: "settledSuccessfully" })
  })

  it("needs a transaction", async () => {
    const { provider } = makeProvider()
    await expect(provider.retrievePayment({ data: sessionData() })).rejects.toThrow("needs the transaction id")
  })
})

describe("updatePayment", () => {
  it("returns the data as it is", async () => {
    const { provider, client } = makeProvider()
    const data = sessionData()
    expect(await provider.updatePayment({ data, amount: 10, currency_code: "usd" })).toEqual({ data })
    expect(client.createTransaction).not.toHaveBeenCalled()
  })
})

describe("toRefId", () => {
  it("keeps a Medusa id as it is under the XSD's limit", () => {
    expect(REF_ID_MAX_LENGTH).toBe(50)
    expect(toRefId(SESSION_ID)).toBe(SESSION_ID)
    expect(SESSION_ID).toHaveLength(33)
  })

  it("drops the prefix and the end under a shorter limit", () => {
    expect(toRefId(SESSION_ID, 20)).toBe("01JBTESTAAAAAAAAAAAA")
  })

  it("is undefined without an id", () => {
    expect(toRefId(undefined)).toBeUndefined()
  })
})

import { BigNumber, MedusaError, PaymentSessionStatus } from "@medusajs/framework/utils"
import {
  approved,
  CART,
  COLLECTION_ID,
  details,
  gatewayError,
  logged,
  makeProvider,
  OPAQUE_DATA,
  SESSION_ID,
  sent,
  sessionData,
  TOKEN,
  TRANS_ID,
} from "./test-utils"

describe("initiatePayment", () => {
  it("keeps the token, the amount and the currency without calling Authorize.net", async () => {
    const { provider, client } = makeProvider()

    const output = await provider.initiatePayment({
      amount: new BigNumber(19.99),
      currency_code: "USD",
      data: { session_id: SESSION_ID, opaque_data: OPAQUE_DATA },
      context: { idempotency_key: SESSION_ID },
    })

    expect(output).toEqual({
      id: SESSION_ID,
      status: PaymentSessionStatus.PENDING,
      data: { session_id: SESSION_ID, amount: 19.99, currency_code: "usd", opaque_data: OPAQUE_DATA },
    })
    expect(client.createTransaction).not.toHaveBeenCalled()
  })

  it("accepts a Google Pay token and the express flag", async () => {
    const { provider } = makeProvider()
    const googlePay = { dataDescriptor: "COMMON.GOOGLE.INAPP.PAYMENT", dataValue: "eyJzaWduYXR1cmUiOiIuLi4ifQ==" }
    const output = await provider.initiatePayment({
      amount: 10,
      currency_code: "usd",
      data: { session_id: SESSION_ID, opaque_data: googlePay, express: true },
    })
    expect(output.data).toMatchObject({ opaque_data: googlePay, express: true })
  })

  it("drops anything else the storefront sends, writing it as null over the stored data (regression В9)", async () => {
    const { provider } = makeProvider()
    const output = await provider.initiatePayment({
      amount: 10,
      currency_code: "usd",
      data: {
        session_id: SESSION_ID,
        opaque_data: OPAQUE_DATA,
        cart: { billing_address: { address_1: "forged" } },
        amount: 0.01,
        capture: true,
      },
    })
    expect(output.data).toEqual({
      session_id: SESSION_ID,
      amount: 10,
      currency_code: "usd",
      opaque_data: OPAQUE_DATA,
      cart: null,
      capture: null,
    })
  })

  it("starts a session without a token, for a storefront that creates it on selection", async () => {
    const { provider } = makeProvider()
    const output = await provider.initiatePayment({ amount: 10, currency_code: "usd", data: { session_id: SESSION_ID } })
    expect(output.data).toEqual({ session_id: SESSION_ID, amount: 10, currency_code: "usd" })
  })

  it.each([
    [{ dataDescriptor: "COMMON.APPLE.INAPP.PAYMENT", dataValue: TOKEN }],
    [{ dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT", dataValue: "" }],
    ["just-a-string"],
  ])("refuses a token it does not accept: %p", async (opaque) => {
    const { provider } = makeProvider()
    await expect(
      provider.initiatePayment({ amount: 10, currency_code: "usd", data: { session_id: SESSION_ID, opaque_data: opaque } })
    ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
  })

  it("needs the session id", async () => {
    const { provider } = makeProvider()
    await expect(provider.initiatePayment({ amount: 10, currency_code: "usd", data: {} })).rejects.toThrow(
      "Authorize.net initiatePayment needs data.session_id"
    )
  })
})

describe("authorizePayment with a token", () => {
  it("captures right away with authCaptureTransaction when the merchant captures automatically (regression В1)", async () => {
    const { provider, client, logger } = makeProvider({ capture: "automatic" })
    client.createTransaction.mockResolvedValue(approved())

    const output = await provider.authorizePayment({ data: sessionData(), context: { idempotency_key: SESSION_ID } })

    const { request, refId } = sent(client)
    expect(request).toEqual({
      transactionType: "authCaptureTransaction",
      amount: "19.99",
      currencyCode: "USD",
      payment: { opaqueData: OPAQUE_DATA },
      customer: { email: "buyer@example.com" },
      billTo: {
        firstName: "Jane",
        lastName: "Doe",
        address: "1 Main St",
        city: "Indianapolis",
        state: "IN",
        zip: "46201",
        country: "US",
        phoneNumber: "+13175550100",
      },
      shipTo: {
        firstName: "John",
        lastName: "Doe",
        address: "2 Side St, Apt 3",
        city: "Carmel",
        state: "IN",
        zip: "46032",
        country: "US",
      },
      userFields: {
        userField: [
          { name: "medusa_session_id", value: SESSION_ID },
          { name: "medusa_cart_id", value: "cart_1" },
        ],
      },
    })
    expect(refId).toBe(SESSION_ID)
    expect(provider.getPaymentCollectionId).toHaveBeenCalledWith(SESSION_ID)
    expect(provider.getAuthorizeNetCart).toHaveBeenCalledWith(COLLECTION_ID)

    expect(output.status).toBe(PaymentSessionStatus.CAPTURED)
    expect(output.data).toMatchObject({
      transId: TRANS_ID,
      transactionStatus: "capturedPendingSettlement",
      card_brand: "visa",
      card_last4: "1111",
      opaque_data: null,
    })
    expect(logger.info).toHaveBeenCalledWith(`Authorize.net transaction ${TRANS_ID} captured for payment session ${SESSION_ID}`)
  })

  it("only authorizes with authOnlyTransaction when the merchant captures by hand (regression В1)", async () => {
    const { provider, client } = makeProvider({ capture: "manual" })
    client.createTransaction.mockResolvedValue(approved())

    const output = await provider.authorizePayment({ data: sessionData() })

    expect(sent(client).request.transactionType).toBe("authOnlyTransaction")
    expect(output.status).toBe(PaymentSessionStatus.AUTHORIZED)
    expect(output.data.transactionStatus).toBe("authorizedPendingCapture")
  })

  it("always sends the session's currency (regression В2)", async () => {
    const { provider, client } = makeProvider()
    client.createTransaction.mockResolvedValue(approved())
    await provider.authorizePayment({ data: sessionData({ currency_code: "eur", amount: 7.5 }) })
    expect(sent(client).request).toMatchObject({ amount: "7.50", currencyCode: "EUR" })
  })

  it("bills the delivery address when the cart has no billing address", async () => {
    const { provider, client } = makeProvider({}, { ...CART, billing_address: null })
    client.createTransaction.mockResolvedValue(approved())
    await provider.authorizePayment({ data: sessionData() })
    expect(sent(client).request.billTo).toMatchObject({ firstName: "John", zip: "46032", phoneNumber: "+13175550199" })
  })

  it("charges a cart with no delivery address without failing (regression В9)", async () => {
    const { provider, client } = makeProvider({}, { ...CART, shipping_address: null })
    client.createTransaction.mockResolvedValue(approved())
    await provider.authorizePayment({ data: sessionData() })
    expect(sent(client).request).not.toHaveProperty("shipTo")
    expect(sent(client).request.billTo.firstName).toBe("Jane")
  })

  it("goes on without addresses when the cart cannot be read", async () => {
    const { provider, client, logger } = makeProvider()
    provider.getAuthorizeNetCart.mockRejectedValue(new Error("query failed"))
    client.createTransaction.mockResolvedValue(approved())

    await provider.authorizePayment({ data: sessionData() })

    const { request } = sent(client)
    expect(request).not.toHaveProperty("billTo")
    expect(request).not.toHaveProperty("customer")
    expect(request.userFields.userField).toEqual([{ name: "medusa_session_id", value: SESSION_ID }])
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("could not read the cart"))
  })

  it("waits for a transaction the Fraud Detection Suite held (regression В5)", async () => {
    const { provider, client, logger } = makeProvider()
    client.createTransaction.mockResolvedValue(approved({}, "4"))

    const output = await provider.authorizePayment({ data: sessionData() })

    expect(output.status).toBe(PaymentSessionStatus.PENDING_AUTHORIZATION)
    expect(output.data).toMatchObject({ transId: TRANS_ID, held: true, opaque_data: null })
    expect(output.data).not.toHaveProperty("transactionStatus")
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("held transaction 60001 for review"))
  })

  it("hands a decline back with Authorize.net's text", async () => {
    const { provider, client, logger } = makeProvider()
    client.createTransaction.mockRejectedValue(gatewayError("2", "This transaction has been declined.", "2"))

    const error = await provider.authorizePayment({ data: sessionData() }).catch((e: unknown) => e)

    expect(error).toMatchObject({
      type: MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
      message: expect.stringContaining("This transaction has been declined."),
    })
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("AuthorizeNetBase.authorizePayment failed"))
  })

  it("needs a token when there is no transaction yet", async () => {
    const { provider, client } = makeProvider()
    await expect(provider.authorizePayment({ data: sessionData({ opaque_data: undefined }) })).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
    expect(client.createTransaction).not.toHaveBeenCalled()
  })

  it("never logs the token, the transaction key or the buyer's details at a level above debug", async () => {
    const { provider, client, logger } = makeProvider()
    client.createTransaction.mockResolvedValue(approved())
    await provider.authorizePayment({ data: sessionData() })

    const all = logged(logger)
    expect(all).not.toContain(TOKEN)
    expect(all).not.toContain("SECRET-transaction-key")
    const aboveDebug = ["info", "warn", "error"]
      .flatMap((level) => logger[level].mock.calls.map((call: unknown[]) => call.join(" ")))
      .join("\n")
    expect(aboveDebug).not.toContain("buyer@example.com")
    expect(aboveDebug).not.toContain("1 Main St")
  })
})

describe("authorizePayment with a transaction", () => {
  it("reads the status instead of charging again", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details("authorizedPendingCapture"))

    const output = await provider.authorizePayment({
      data: sessionData({ opaque_data: null, transId: TRANS_ID, held: true }),
    })

    expect(client.createTransaction).not.toHaveBeenCalled()
    expect(client.getTransactionDetails).toHaveBeenCalledWith(TRANS_ID)
    expect(output.status).toBe(PaymentSessionStatus.AUTHORIZED)
    expect(output.data).toMatchObject({ transactionStatus: "authorizedPendingCapture", card_last4: "1111" })
  })

  it.each([
    ["FDSPendingReview", PaymentSessionStatus.PENDING_AUTHORIZATION],
    ["capturedPendingSettlement", PaymentSessionStatus.CAPTURED],
    ["declined", PaymentSessionStatus.ERROR],
  ])("maps %s to %s", async (status, expected) => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue(details(status))
    const output = await provider.authorizePayment({ data: { transId: TRANS_ID } })
    expect(output.status).toBe(expected)
  })
})

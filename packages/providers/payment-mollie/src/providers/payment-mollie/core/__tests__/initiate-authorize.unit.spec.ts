import { MedusaError, PaymentSessionStatus } from "@medusajs/framework/utils"
import {
  API_KEY,
  CART,
  CHECKOUT_URL,
  logged,
  makeProvider,
  paidData,
  payment,
  PAYMENT_ID,
  RETURN_URL,
  SESSION_ID,
  sessionData,
  WEBHOOK_URL,
} from "./test-utils"

function initiateInput(overrides: Record<string, unknown> = {}) {
  return {
    amount: 19.99,
    currency_code: "eur",
    data: { session_id: SESSION_ID, redirect_url: RETURN_URL, locale: "nl" },
    context: { idempotency_key: SESSION_ID },
    ...overrides,
  }
}

describe("initiatePayment", () => {
  it("creates the Mollie payment with the cart's addresses and keys it on the session", async () => {
    const { provider, client } = makeProvider()
    client.payments.create.mockResolvedValue(payment())

    const output = await provider.initiatePayment(initiateInput())

    expect(client.payments.create).toHaveBeenCalledWith({
      idempotencyKey: SESSION_ID,
      paymentRequest: {
        description: "Cart cart_1",
        amount: { currency: "EUR", value: "19.99" },
        redirectUrl: RETURN_URL,
        webhookUrl: WEBHOOK_URL,
        locale: "nl_NL",
        billingAddress: {
          givenName: "Jan",
          familyName: "Jansen",
          streetAndNumber: "Keizersgracht 126",
          postalCode: "1015 CW",
          city: "Amsterdam",
          country: "NL",
          email: "jan@example.com",
        },
        shippingAddress: {
          givenName: "Piet",
          familyName: "Jansen",
          streetAndNumber: "Prinsengracht 2",
          streetAdditional: "Achterhuis",
          postalCode: "1015 DV",
          city: "Amsterdam",
          country: "NL",
          email: "jan@example.com",
        },
        metadata: { session_id: SESSION_ID, cart_id: "cart_1" },
      },
    })
    expect(output).toEqual({ id: PAYMENT_ID, status: PaymentSessionStatus.PENDING, data: sessionData() })
  })

  it("asks Mollie to hold the amount when the merchant captures manually", async () => {
    const { provider, client } = makeProvider({ capture: "manual" })
    client.payments.create.mockResolvedValue(payment({ captureMode: "manual" }))
    await provider.initiatePayment(initiateInput())
    expect(client.payments.create.mock.calls[0][0].paymentRequest.captureMode).toBe("manual")
  })

  it("M4: sends a JPY amount without decimals", async () => {
    const { provider, client } = makeProvider()
    client.payments.create.mockResolvedValue(payment({ amount: { currency: "JPY", value: "1000" } }))
    await provider.initiatePayment(initiateInput({ amount: 1000, currency_code: "jpy" }))
    expect(client.payments.create.mock.calls[0][0].paymentRequest.amount).toEqual({ currency: "JPY", value: "1000" })
  })

  it("M13: leaves out an incomplete address instead of sending empty strings", async () => {
    const { provider, client } = makeProvider({}, {
      ...CART,
      billing_address: { ...CART.billing_address, postal_code: "" },
      shipping_address: null,
    })
    client.payments.create.mockResolvedValue(payment())
    await provider.initiatePayment(initiateInput())
    const request = client.payments.create.mock.calls[0][0].paymentRequest
    expect(request).not.toHaveProperty("billingAddress")
    expect(request).not.toHaveProperty("shippingAddress")
  })

  it("M14: uses the merchant's description, cut to Mollie's 255 characters", async () => {
    const { provider, client } = makeProvider({ paymentDescription: `Order at Example ${"x".repeat(300)}` })
    client.payments.create.mockResolvedValue(payment())
    await provider.initiatePayment(initiateInput())
    const description = client.payments.create.mock.calls[0][0].paymentRequest.description
    expect(description.startsWith("Order at Example")).toBe(true)
    expect(description).toHaveLength(255)
  })

  it("creates the payment without addresses when the cart cannot be read", async () => {
    const { provider, client, logger } = makeProvider()
    provider.getPaymentCollectionId.mockRejectedValue(new Error("no collection"))
    client.payments.create.mockResolvedValue(payment())
    await provider.initiatePayment(initiateInput())
    const request = client.payments.create.mock.calls[0][0].paymentRequest
    expect(request.description).toBe(`Payment ${SESSION_ID}`)
    expect(request).not.toHaveProperty("billingAddress")
    expect(request.metadata).toEqual({ session_id: SESSION_ID })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("could not read the cart"))
  })

  it("drops what the storefront sends beyond the return URL and the locale", async () => {
    const { provider, client, logger } = makeProvider()
    client.payments.create.mockResolvedValue(payment())
    const output = await provider.initiatePayment(
      initiateInput({
        data: {
          session_id: SESSION_ID,
          redirect_url: RETURN_URL,
          cart: { id: "cart_1" },
          webhookUrl: "https://evil.example.com/hook",
        },
      })
    )
    expect(client.payments.create.mock.calls[0][0].paymentRequest.webhookUrl).toBe(WEBHOOK_URL)
    expect(output.data).toMatchObject({ cart: null, webhookUrl: null, checkout_url: CHECKOUT_URL })
    expect(logger.debug).toHaveBeenCalledWith("MollieBase.initiatePayment ignores session data keys: cart, webhookUrl")
  })

  it.each([undefined, "/api/payment-return", "javascript:alert(1)"])(
    "refuses a session without an absolute return URL (%s)",
    async (redirectUrl) => {
      const { provider, client } = makeProvider()
      await expect(
        provider.initiatePayment(initiateInput({ data: { session_id: SESSION_ID, redirect_url: redirectUrl } }))
      ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA, message: expect.stringContaining("redirect_url") })
      expect(client.payments.create).not.toHaveBeenCalled()
    }
  )

  it("never logs the key, the buyer's email or the street", async () => {
    const { provider, client, logger } = makeProvider()
    client.payments.create.mockResolvedValue(payment())
    await provider.initiatePayment(initiateInput())
    const text = logged(logger)
    expect(text).not.toContain(API_KEY)
    expect(text).not.toContain("jan@example.com")
    expect(text).not.toContain("Keizersgracht")
  })
})

describe("authorizePayment", () => {
  it.each([
    ["paid", PaymentSessionStatus.CAPTURED],
    ["authorized", PaymentSessionStatus.AUTHORIZED],
    ["canceled", PaymentSessionStatus.CANCELED],
    ["expired", PaymentSessionStatus.CANCELED],
  ])("reads a %s payment as %s", async (status, expected) => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status }))
    const output = await provider.authorizePayment({ data: sessionData() })
    expect(client.payments.get).toHaveBeenCalledWith({ paymentId: PAYMENT_ID })
    expect(output.status).toBe(expected)
    expect(output.data).toMatchObject({ id: PAYMENT_ID, status })
  })

  it("M6: reports an open or pending payment instead of throwing", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValueOnce(payment({ status: "open" }))
    await expect(provider.authorizePayment({ data: sessionData() })).resolves.toMatchObject({
      status: PaymentSessionStatus.REQUIRES_MORE,
    })
    client.payments.get.mockResolvedValueOnce(payment({ status: "pending" }))
    await expect(provider.authorizePayment({ data: sessionData() })).resolves.toMatchObject({
      status: PaymentSessionStatus.PENDING,
    })
  })

  it("keeps the card's brand and last four digits of a paid payment", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "paid" }))
    const output = await provider.authorizePayment({ data: sessionData() })
    expect(output.data).toEqual(paidData())
  })

  it("hands back a failed payment with Mollie's reason", async () => {
    const { provider, client } = makeProvider()
    client.payments.get.mockResolvedValue(
      payment({ status: "failed", details: { failureReason: "insufficient_funds", failureMessage: "Insufficient funds" } })
    )
    await expect(provider.authorizePayment({ data: sessionData() })).rejects.toMatchObject({
      type: MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
      message: `Mollie payment ${PAYMENT_ID} failed: Insufficient funds`,
    })
  })

  it("warns about a status it does not know and keeps the session pending", async () => {
    const { provider, client, logger } = makeProvider()
    client.payments.get.mockResolvedValue(payment({ status: "settling" }))
    const output = await provider.authorizePayment({ data: sessionData() })
    expect(output.status).toBe(PaymentSessionStatus.PENDING)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("settling"))
  })

  it("needs the Mollie payment id", async () => {
    const { provider, client } = makeProvider()
    await expect(provider.authorizePayment({ data: { session_id: SESSION_ID } })).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
    expect(client.payments.get).not.toHaveBeenCalled()
  })
})

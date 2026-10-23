import Stripe from "stripe"
import { MedusaError, PaymentSessionStatus } from "@medusajs/framework/utils"
import { CART, COLLECTION_ID, CUSTOMER_ID, intent, logged, makeProvider, SESSION_ID } from "./test-utils"

const input = (data: Record<string, unknown> = {}, context: Record<string, unknown> = {}) => ({
  amount: 19.99,
  currency_code: "USD",
  data: { session_id: SESSION_ID, ...data },
  context: { idempotency_key: SESSION_ID, ...context },
})

describe("StripeBase.initiatePayment", () => {
  it("creates the PaymentIntent from Medusa's amount, the settings and the cart", async () => {
    const { provider, stripe } = makeProvider({
      paymentDescription: "Order from Shop",
      statementDescriptorSuffix: "SHOP",
      sendReceiptEmail: true,
    })
    stripe.paymentIntents.create.mockResolvedValue(intent())

    const output = await provider.initiatePayment(input())

    expect(provider.getStripeCart).toHaveBeenCalledWith(COLLECTION_ID)
    expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
      {
        amount: 1999,
        currency: "usd",
        capture_method: "automatic_async",
        automatic_payment_methods: { enabled: true },
        metadata: { session_id: SESSION_ID, payment_collection_id: COLLECTION_ID, cart_id: "cart_1" },
        description: "Order from Shop",
        statement_descriptor_suffix: "SHOP",
        shipping: {
          name: "Jane Doe",
          phone: "+15555550100",
          address: { line1: "1 Main St", line2: "Apt 2", city: "Springfield", state: "IL", postal_code: "62701", country: "US" },
        },
        receipt_email: "buyer@example.com",
      },
      { idempotencyKey: SESSION_ID }
    )
    expect(output).toEqual({
      id: "pi_1",
      status: PaymentSessionStatus.PENDING,
      data: {
        session_id: SESSION_ID,
        id: "pi_1",
        client_secret: "pi_1_secret_abc",
        status: "requires_payment_method",
        amount: 1999,
        currency: "usd",
        capture_method: "automatic_async",
      },
    })
  })

  it("never sends payment_method_types, which API version endive refuses", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.create.mockResolvedValue(intent())

    await provider.initiatePayment(input({ payment_method_types: ["card"] }))

    expect(stripe.paymentIntents.create.mock.calls[0][0]).not.toHaveProperty("payment_method_types")
  })

  it.each([
    ["UGX", 5000, 500000],
    ["KWD", "5.124", 5120],
    ["JPY", 500, 500],
  ])("sends %s amounts in Stripe's units (%p → %p)", async (currency, amount, expected) => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.create.mockResolvedValue(intent())

    await provider.initiatePayment({ ...input(), amount, currency_code: currency })

    expect(stripe.paymentIntents.create.mock.calls[0][0]).toMatchObject({ amount: expected, currency: currency.toLowerCase() })
  })

  it("uses manual capture and the payment method configuration from the settings", async () => {
    const { provider, stripe } = makeProvider({ capture: "manual", paymentMethodConfiguration: "pmc_1" })
    stripe.paymentIntents.create.mockResolvedValue(intent())

    await provider.initiatePayment(input())

    expect(stripe.paymentIntents.create.mock.calls[0][0]).toMatchObject({
      capture_method: "manual",
      payment_method_configuration: "pmc_1",
      automatic_payment_methods: { enabled: true },
    })
  })

  it("keeps what the storefront sends out of the PaymentIntent (regression of D4)", async () => {
    const { provider, stripe, logger } = makeProvider({ capture: "manual" })
    stripe.paymentIntents.create.mockResolvedValue(intent())

    await provider.initiatePayment(
      input({
        capture_method: "automatic",
        confirm: true,
        payment_method_types: ["card"],
        metadata: { injected: "yes" },
        return_url: "https://evil.example",
        setup_future_usage: "off_session",
        payment_method: "pm_1",
      })
    )

    const request = stripe.paymentIntents.create.mock.calls[0][0]
    expect(request.capture_method).toBe("manual")
    expect(request).not.toHaveProperty("confirm")
    expect(request).not.toHaveProperty("return_url")
    expect(request.metadata).not.toHaveProperty("injected")
    // a guest has no Stripe customer, so neither a saved card nor saving one applies
    expect(request).not.toHaveProperty("setup_future_usage")
    expect(request).not.toHaveProperty("payment_method")
    expect(logged(logger)).toContain("ignores session data keys: capture_method, confirm, payment_method_types, metadata, return_url, setup_future_usage, payment_method")
  })

  it("lets a logged-in customer save the card or pay with a saved one", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.create.mockResolvedValue(intent())

    await provider.initiatePayment(
      input({ setup_future_usage: "off_session", payment_method: "pm_saved" }, { account_holder: { data: { id: CUSTOMER_ID } } })
    )

    expect(stripe.paymentIntents.create.mock.calls[0][0]).toMatchObject({
      customer: CUSTOMER_ID,
      setup_future_usage: "off_session",
      payment_method: "pm_saved",
    })
  })

  it.each([[{ setup_future_usage: "always" }], [{ payment_method: "card_1" }]])(
    "drops an invalid value for a customer: %p",
    async (data) => {
      const { provider, stripe } = makeProvider()
      stripe.paymentIntents.create.mockResolvedValue(intent())

      await provider.initiatePayment(input(data, { account_holder: { data: { id: CUSTOMER_ID } } }))

      const request = stripe.paymentIntents.create.mock.calls[0][0]
      expect(request).not.toHaveProperty("setup_future_usage")
      expect(request).not.toHaveProperty("payment_method")
    }
  )

  it("leaves the address of an express payment to the wallet, which sends it when the storefront confirms", async () => {
    const { provider, stripe, logger } = makeProvider()
    stripe.paymentIntents.create.mockResolvedValue(intent())

    await provider.initiatePayment(input({ express: true }))

    // Stripe refuses a wallet's shipping once the backend set it with the secret key
    expect(stripe.paymentIntents.create.mock.calls[0][0]).not.toHaveProperty("shipping")
    expect(logged(logger)).not.toContain("ignores session data keys")
  })

  it("keeps the cart's address when express is anything but true", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.create.mockResolvedValue(intent())

    await provider.initiatePayment(input({ express: "yes" }))

    expect(stripe.paymentIntents.create.mock.calls[0][0]).toHaveProperty("shipping")
  })

  it("leaves out an address without a name or a street, and the email when receipts are off", async () => {
    const { provider, stripe } = makeProvider({}, { ...CART, shipping_address: { ...CART.shipping_address, first_name: null, last_name: null } })
    stripe.paymentIntents.create.mockResolvedValue(intent())

    await provider.initiatePayment(input())

    const request = stripe.paymentIntents.create.mock.calls[0][0]
    expect(request).not.toHaveProperty("shipping")
    expect(request).not.toHaveProperty("receipt_email")
  })

  it("creates the PaymentIntent without the cart when the collection has none or the read fails", async () => {
    const { provider, stripe, logger } = makeProvider({}, null)
    stripe.paymentIntents.create.mockResolvedValue(intent())
    await provider.initiatePayment(input())
    expect(stripe.paymentIntents.create.mock.calls[0][0].metadata).toEqual({ session_id: SESSION_ID, payment_collection_id: COLLECTION_ID })

    provider.getStripeCart.mockRejectedValue(new Error("db down"))
    await provider.initiatePayment(input())
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(2)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("db down"))
  })

  it("throws instead of keeping a session without a PaymentIntent when Stripe fails (regression of D6)", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentIntents.create.mockRejectedValue(new Stripe.errors.StripeAPIError({ message: "Stripe is down", requestId: "req_5" } as any))

    await expect(provider.initiatePayment(input())).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
      requestId: "req_5",
    })
  })

  it("needs the session id", async () => {
    const { provider } = makeProvider()
    await expect(provider.initiatePayment({ ...input(), data: {} })).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
  })

  it("never logs the client secret or the secret key", async () => {
    const { provider, stripe, logger } = makeProvider()
    stripe.paymentIntents.create.mockResolvedValue(intent())

    await provider.initiatePayment(input())

    const text = logged(logger)
    expect(text).not.toContain("pi_1_secret_abc")
    expect(text).not.toContain("sk_test_123")
    expect(text).toContain("[redacted]")
  })
})

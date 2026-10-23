import { MedusaError } from "@medusajs/framework/utils"
import { CUSTOMER_ID, makeProvider } from "./test-utils"

const customer = {
  id: "cus_medusa_1",
  email: "buyer@example.com",
  first_name: "Jane",
  last_name: "Doe",
  phone: "+15555550100",
  billing_address: {
    address_1: "1 Main St",
    address_2: null,
    city: "Springfield",
    province: "IL",
    postal_code: "62701",
    country_code: "us",
  },
} as any

const holder = { account_holder: { data: { id: CUSTOMER_ID } } }

describe("StripeBase.createAccountHolder", () => {
  it("creates a Stripe customer with the billing address as its address", async () => {
    const { provider, stripe } = makeProvider()
    stripe.customers.create.mockResolvedValue({ id: CUSTOMER_ID, email: "buyer@example.com", address: {} })

    const output = await provider.createAccountHolder({ context: { customer, idempotency_key: "cus_medusa_1" } })

    expect(stripe.customers.create).toHaveBeenCalledWith(
      {
        email: "buyer@example.com",
        name: "Jane Doe",
        phone: "+15555550100",
        address: { line1: "1 Main St", city: "Springfield", state: "IL", postal_code: "62701", country: "US" },
        metadata: { medusa_customer_id: "cus_medusa_1" },
      },
      { idempotencyKey: "cus_medusa_1" }
    )
    expect(output).toEqual({ id: CUSTOMER_ID, data: { id: CUSTOMER_ID, email: "buyer@example.com" } })
  })

  it("prefers the company name", async () => {
    const { provider, stripe } = makeProvider()
    stripe.customers.create.mockResolvedValue({ id: CUSTOMER_ID })
    await provider.createAccountHolder({ context: { customer: { ...customer, company_name: "Acme", billing_address: null } } })
    expect(stripe.customers.create.mock.calls[0][0]).toMatchObject({ name: "Acme" })
    expect(stripe.customers.create.mock.calls[0][0]).not.toHaveProperty("address")
  })

  it("returns the existing account holder without a call", async () => {
    const { provider, stripe } = makeProvider()
    expect(await provider.createAccountHolder({ context: { ...holder, customer } })).toEqual({ id: CUSTOMER_ID })
    expect(stripe.customers.create).not.toHaveBeenCalled()
  })

  it("needs a customer, and fails with Stripe's error", async () => {
    const { provider, stripe } = makeProvider()
    await expect(provider.createAccountHolder({ context: {} })).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
    stripe.customers.create.mockRejectedValue(new Error("boom"))
    await expect(provider.createAccountHolder({ context: { customer } })).rejects.toThrow("boom")
  })
})

describe("StripeBase.updateAccountHolder and deleteAccountHolder", () => {
  it("updates the Stripe customer", async () => {
    const { provider, stripe } = makeProvider()
    stripe.customers.update.mockResolvedValue({ id: CUSTOMER_ID, email: "new@example.com" })

    const output = await provider.updateAccountHolder({ context: { ...holder, customer: { ...customer, email: "new@example.com" } } })

    expect(stripe.customers.update).toHaveBeenCalledWith(CUSTOMER_ID, expect.objectContaining({ email: "new@example.com" }), {
      idempotencyKey: undefined,
    })
    expect(output).toEqual({ data: { id: CUSTOMER_ID, email: "new@example.com" } })
  })

  it("updates nothing without customer details, and needs an account holder", async () => {
    const { provider, stripe } = makeProvider()
    expect(await provider.updateAccountHolder({ context: holder })).toEqual({})
    expect(stripe.customers.update).not.toHaveBeenCalled()
    await expect(provider.updateAccountHolder({ context: { customer } })).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
    stripe.customers.update.mockRejectedValue(new Error("boom"))
    await expect(provider.updateAccountHolder({ context: { ...holder, customer } })).rejects.toThrow("boom")
  })

  it("deletes the Stripe customer", async () => {
    const { provider, stripe } = makeProvider()
    stripe.customers.del.mockResolvedValue({ id: CUSTOMER_ID, deleted: true })
    expect(await provider.deleteAccountHolder({ context: holder })).toEqual({})
    expect(stripe.customers.del).toHaveBeenCalledWith(CUSTOMER_ID)
    await expect(provider.deleteAccountHolder({ context: { account_holder: {} } })).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
    stripe.customers.del.mockRejectedValue(new Error("boom"))
    await expect(provider.deleteAccountHolder({ context: holder })).rejects.toThrow("boom")
  })
})

describe("StripeBase saved payment methods", () => {
  it("lists a customer's methods without the full objects", async () => {
    const { provider, stripe } = makeProvider()
    stripe.customers.listPaymentMethods.mockResolvedValue({
      data: [
        {
          id: "pm_1",
          type: "card",
          card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2034, wallet: null, fingerprint: "fp" },
          billing_details: { email: "buyer@example.com" },
        },
      ],
    })

    const output = await provider.listPaymentMethods({ context: holder })

    expect(stripe.customers.listPaymentMethods).toHaveBeenCalledWith(CUSTOMER_ID, { limit: 100 })
    expect(output).toEqual([
      { id: "pm_1", data: { id: "pm_1", type: "card", card_brand: "visa", card_last4: "4242", card_exp_month: 12, card_exp_year: 2034 } },
    ])
  })

  it("lists nothing without an account holder, and fails with Stripe's error", async () => {
    const { provider, stripe } = makeProvider()
    expect(await provider.listPaymentMethods({ context: {} })).toEqual([])
    stripe.customers.listPaymentMethods.mockRejectedValue(new Error("boom"))
    await expect(provider.listPaymentMethods({ context: holder })).rejects.toThrow("boom")
  })

  it("starts saving a method with a SetupIntent for the account holder only", async () => {
    const { provider, stripe } = makeProvider()
    stripe.setupIntents.create.mockResolvedValue({ id: "seti_1", client_secret: "seti_1_secret", status: "requires_payment_method" })

    const output = await provider.savePaymentMethod({
      context: { ...holder, idempotency_key: "key_1" },
      data: { customer: "cus_other", payment_method: "pm_1", usage: "on_session" },
    })

    expect(stripe.setupIntents.create).toHaveBeenCalledWith(
      { customer: CUSTOMER_ID, usage: "off_session", automatic_payment_methods: { enabled: true }, payment_method: "pm_1" },
      { idempotencyKey: "key_1" }
    )
    expect(output).toEqual({
      id: "seti_1",
      data: { id: "seti_1", client_secret: "seti_1_secret", status: "requires_payment_method", customer: CUSTOMER_ID },
    })
  })

  it("needs an account holder to save, and fails with Stripe's error", async () => {
    const { provider, stripe } = makeProvider()
    await expect(provider.savePaymentMethod({ context: {}, data: {} })).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
    stripe.setupIntents.create.mockRejectedValue(new Error("boom"))
    await expect(provider.savePaymentMethod({ context: holder, data: {} })).rejects.toThrow("boom")
  })

  it("detaches a method that belongs to the customer", async () => {
    const { provider, stripe } = makeProvider()
    stripe.paymentMethods.retrieve.mockResolvedValue({ id: "pm_1", customer: CUSTOMER_ID })
    stripe.paymentMethods.detach.mockResolvedValue({ id: "pm_1" })

    expect(await provider.deletePaymentMethod({ context: holder, data: { id: "pm_1" } })).toEqual({})
    expect(stripe.paymentMethods.detach).toHaveBeenCalledWith("pm_1", {}, { idempotencyKey: undefined })
  })

  it.each([
    ["another customer's", { id: "pm_1", customer: "cus_other" }, holder],
    ["an expanded other customer's", { id: "pm_1", customer: { id: "cus_other" } }, holder],
    ["any method without an account holder", { id: "pm_1", customer: CUSTOMER_ID }, {}],
  ])("refuses to detach %s method", async (_, method, context) => {
    const { provider, stripe } = makeProvider()
    stripe.paymentMethods.retrieve.mockResolvedValue(method)

    await expect(provider.deletePaymentMethod({ context, data: { id: "pm_1" } })).rejects.toMatchObject({
      type: MedusaError.Types.NOT_ALLOWED,
    })
    expect(stripe.paymentMethods.detach).not.toHaveBeenCalled()
  })

  it("needs the method id", async () => {
    const { provider } = makeProvider()
    await expect(provider.deletePaymentMethod({ context: holder, data: {} })).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
  })
})

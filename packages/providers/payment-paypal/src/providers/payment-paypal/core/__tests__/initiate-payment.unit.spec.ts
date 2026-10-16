import { MedusaError } from "@medusajs/framework/utils"
import { COLLECTION_ID, makeProvider, order, ORDER_ID, SESSION_ID } from "./test-utils"

describe("PayPalBase.initiatePayment: new order", () => {
  it("creates an order tied to the session and the payment collection", async () => {
    const { provider, client } = makeProvider()
    client.createOrder.mockResolvedValue(order())

    const output = await provider.initiatePayment({
      amount: 10,
      currency_code: "eur",
      data: { session_id: SESSION_ID },
      context: { idempotency_key: SESSION_ID },
    })

    const [body, requestId] = client.createOrder.mock.calls[0]
    expect(requestId).toBe(SESSION_ID)
    expect(body.intent).toBe("CAPTURE")
    expect(body.purchase_units[0]).toEqual({
      reference_id: COLLECTION_ID,
      custom_id: SESSION_ID,
      amount: { currency_code: "EUR", value: "10.00" },
    })
    expect(body.payment_source.paypal.experience_context).toEqual({
      landing_page: "NO_PREFERENCE",
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
    })
    expect(provider.getPaymentCollectionId).toHaveBeenCalledWith(SESSION_ID)
    expect(output).toEqual({
      id: ORDER_ID,
      data: {
        session_id: SESSION_ID,
        paypal_order_id: ORDER_ID,
        intent: "CAPTURE",
        currency_code: "EUR",
        status: "CREATED",
      },
    })
  })

  it("sends amounts in a currency without decimals as whole numbers", async () => {
    const { provider, client } = makeProvider()
    client.createOrder.mockResolvedValue(order())

    await provider.initiatePayment({ amount: 1500, currency_code: "jpy", data: { session_id: SESSION_ID } })

    expect(client.createOrder.mock.calls[0][0].purchase_units[0].amount).toEqual({
      currency_code: "JPY",
      value: "1500",
    })
  })

  it("uses intent AUTHORIZE and the merchant's brand, landing page and soft descriptor", async () => {
    const { provider, client } = makeProvider({
      intent: "authorize",
      brandName: "Gorgo Shop",
      landingPage: "GUEST_CHECKOUT",
      softDescriptor: "GORGO",
    })
    client.createOrder.mockResolvedValue(order({ intent: "AUTHORIZE" }))

    await provider.initiatePayment({ amount: 10, currency_code: "EUR", data: { session_id: SESSION_ID } })

    const body = client.createOrder.mock.calls[0][0]
    expect(body.intent).toBe("AUTHORIZE")
    expect(body.purchase_units[0].soft_descriptor).toBe("GORGO")
    expect(body.payment_source.paypal.experience_context).toMatchObject({
      brand_name: "Gorgo Shop",
      landing_page: "GUEST_CHECKOUT",
    })
  })

  it("passes the cart address when the storefront sends one", async () => {
    const { provider, client } = makeProvider()
    client.createOrder.mockResolvedValue(order())

    await provider.initiatePayment({
      amount: 10,
      currency_code: "EUR",
      data: {
        session_id: SESSION_ID,
        shipping_address: {
          first_name: "Anna",
          last_name: "Smith",
          address_1: "Main St 1",
          city: "Berlin",
          postal_code: "10115",
          country_code: "de",
        },
      },
    })

    const body = client.createOrder.mock.calls[0][0]
    expect(body.payment_source.paypal.experience_context.shipping_preference).toBe("SET_PROVIDED_ADDRESS")
    expect(body.purchase_units[0].shipping).toEqual({
      name: { full_name: "Anna Smith" },
      address: { address_line_1: "Main St 1", admin_area_2: "Berlin", postal_code: "10115", country_code: "DE" },
    })
  })

  it("fills the card form with the buyer's email, name and billing address", async () => {
    const { provider, client } = makeProvider()
    client.createOrder.mockResolvedValue(order())

    await provider.initiatePayment({
      amount: 10,
      currency_code: "EUR",
      data: {
        session_id: SESSION_ID,
        email: "anna@example.com",
        billing_address: {
          first_name: "Anna",
          last_name: "Smith",
          address_1: "Billing St 2",
          city: "Hamburg",
          postal_code: "20095",
          country_code: "de",
        },
        shipping_address: { address_1: "Main St 1", city: "Berlin", postal_code: "10115", country_code: "de" },
      },
    })

    const paypal = client.createOrder.mock.calls[0][0].payment_source.paypal
    expect(paypal.email_address).toBe("anna@example.com")
    expect(paypal.name).toEqual({ given_name: "Anna", surname: "Smith" })
    expect(paypal.address).toEqual({
      address_line_1: "Billing St 2",
      admin_area_2: "Hamburg",
      postal_code: "20095",
      country_code: "DE",
    })
  })

  it("takes the name and the street from the delivery address when the billing address lacks them", async () => {
    const { provider, client } = makeProvider()
    client.createOrder.mockResolvedValue(order())

    await provider.initiatePayment({
      amount: 10,
      currency_code: "EUR",
      data: {
        session_id: SESSION_ID,
        billing_address: { country_code: "de" },
        shipping_address: {
          first_name: "Anna",
          last_name: "Smith",
          address_1: "Main St 1",
          city: "Berlin",
          postal_code: "10115",
          country_code: "de",
        },
      },
    })

    const paypal = client.createOrder.mock.calls[0][0].payment_source.paypal
    expect(paypal.email_address).toBeUndefined()
    expect(paypal.name).toEqual({ given_name: "Anna", surname: "Smith" })
    expect(paypal.address).toEqual({
      address_line_1: "Main St 1",
      admin_area_2: "Berlin",
      postal_code: "10115",
      country_code: "DE",
    })
  })

  it("lets the wallet supply the address in an express checkout", async () => {
    const { provider, client } = makeProvider()
    client.createOrder.mockResolvedValue(order())

    const output = await provider.initiatePayment({
      amount: 10,
      currency_code: "EUR",
      data: {
        session_id: SESSION_ID,
        express: true,
        email: "anna@example.com",
        shipping_address: { country_code: "de" },
      },
    })

    const body = client.createOrder.mock.calls[0][0]
    expect(body.payment_source.paypal.experience_context).toMatchObject({
      shipping_preference: "GET_FROM_FILE",
      user_action: "CONTINUE",
    })
    expect(body.payment_source.paypal).not.toHaveProperty("email_address")
    expect(body.payment_source.paypal).not.toHaveProperty("address")
    expect(body.purchase_units[0].shipping).toBeUndefined()
    expect(output.data.express).toBe(true)
  })

  it("refuses a currency PayPal does not support, before calling PayPal", async () => {
    const { provider, client } = makeProvider()

    await expect(
      provider.initiatePayment({ amount: 10, currency_code: "krw", data: { session_id: SESSION_ID } })
    ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
    expect(client.createOrder).not.toHaveBeenCalled()
  })

  it("needs the session id", async () => {
    const { provider } = makeProvider()

    await expect(provider.initiatePayment({ amount: 10, currency_code: "EUR", data: {} })).rejects.toThrow(
      "data.session_id"
    )
  })
})

describe("PayPalBase.initiatePayment: reused order", () => {
  it("takes over the order with a PATCH of the amount and the custom id", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "CREATED" }))

    const output = await provider.initiatePayment({
      amount: 12.5,
      currency_code: "EUR",
      data: { session_id: "payses_2", paypal_order_id: ORDER_ID, express: true },
      context: { idempotency_key: "payses_2" },
    })

    expect(client.createOrder).not.toHaveBeenCalled()
    expect(client.patchOrder).toHaveBeenCalledWith(ORDER_ID, [
      {
        op: "replace",
        path: `/purchase_units/@reference_id=='${COLLECTION_ID}'/amount`,
        value: { currency_code: "EUR", value: "12.50" },
      },
      {
        op: "replace",
        path: `/purchase_units/@reference_id=='${COLLECTION_ID}'/custom_id`,
        value: "payses_2",
      },
    ])
    expect(output.id).toBe(ORDER_ID)
    expect(output.data).toMatchObject({ session_id: "payses_2", paypal_order_id: ORDER_ID, status: "CREATED" })
  })

  it("raises the amount while the buyer is still in the PayPal window", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "PAYER_ACTION_REQUIRED" }))

    await provider.initiatePayment({
      amount: 15,
      currency_code: "EUR",
      data: { session_id: "payses_2", paypal_order_id: ORDER_ID },
    })

    expect(client.patchOrder.mock.calls[0][1][0].value).toEqual({ currency_code: "EUR", value: "15.00" })
  })

  it("lowers the amount of an approved order", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "APPROVED" }))

    await provider.initiatePayment({
      amount: 8,
      currency_code: "EUR",
      data: { session_id: "payses_2", paypal_order_id: ORDER_ID },
    })

    expect(client.patchOrder.mock.calls[0][1][0].value).toEqual({ currency_code: "EUR", value: "8.00" })
  })

  it.each([10, 10.004])("keeps an approved order at the approved amount (%p)", async (amount) => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "APPROVED" }))

    await provider.initiatePayment({
      amount,
      currency_code: "EUR",
      data: { session_id: "payses_2", paypal_order_id: ORDER_ID },
    })

    expect(client.patchOrder).toHaveBeenCalled()
  })

  it("refuses to raise the amount the buyer approved, so the higher total is never captured", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "APPROVED" }))

    await expect(
      provider.initiatePayment({
        amount: 10.01,
        currency_code: "EUR",
        data: { session_id: "payses_2", paypal_order_id: ORDER_ID },
      })
    ).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
      message: expect.stringContaining("approved for 10.00 EUR"),
    })
    expect(client.patchOrder).not.toHaveBeenCalled()
  })

  it("refuses an order of another payment collection", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({}, { reference_id: "pay_col_other" }))

    await expect(
      provider.initiatePayment({
        amount: 10,
        currency_code: "EUR",
        data: { session_id: SESSION_ID, paypal_order_id: ORDER_ID },
      })
    ).rejects.toThrow("belongs to another payment collection")
    expect(client.patchOrder).not.toHaveBeenCalled()
  })

  it("refuses a completed order", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "COMPLETED" }))

    await expect(
      provider.initiatePayment({
        amount: 10,
        currency_code: "EUR",
        data: { session_id: SESSION_ID, paypal_order_id: ORDER_ID },
      })
    ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
    expect(client.patchOrder).not.toHaveBeenCalled()
  })

  it("refuses an order in another currency", async () => {
    const { provider, client } = makeProvider()
    client.getOrder.mockResolvedValue(order())

    await expect(
      provider.initiatePayment({
        amount: 10,
        currency_code: "USD",
        data: { session_id: SESSION_ID, paypal_order_id: ORDER_ID },
      })
    ).rejects.toThrow("is in EUR, not USD")
  })

  it("logs a failure with the Medusa and PayPal ids", async () => {
    const { provider, client, logger } = makeProvider()
    client.getOrder.mockResolvedValue(order({ status: "VOIDED" }))

    await expect(
      provider.initiatePayment({
        amount: 10,
        currency_code: "EUR",
        data: { session_id: SESSION_ID, paypal_order_id: ORDER_ID },
      })
    ).rejects.toThrow()
    expect(logger.error.mock.calls[0][0]).toContain(SESSION_ID)
    expect(logger.error.mock.calls[0][0]).toContain(ORDER_ID)
  })
})

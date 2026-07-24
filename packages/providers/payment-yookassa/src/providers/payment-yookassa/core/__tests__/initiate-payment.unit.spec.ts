import { http, HttpResponse } from "msw"
import YookassaService from "../../services/yookassa"
import { YOOKASSA_BASE_URL, captureRequest, makeLogger, server } from "./test-utils"

const okCreatePaymentResponse = {
  id: "payment_01HX",
  status: "pending",
  amount: { value: "1500.00", currency: "RUB" },
  confirmation: { type: "redirect", confirmation_url: "https://yookassa.ru/checkout/payments/abc" },
  metadata: { session_id: "cart_01HX", receip_tmp: "{}" },
}

const baseOptions = {
  shopId: "test_shop_id",
  secretKey: "test_secret_key",
  capture: false,
} as any

const baseInput = {
  amount: 1500,
  currency_code: "rub",
  data: { session_id: "cart_01HX" },
  context: { idempotency_key: "idem-1" },
} as any

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("YookassaBase.initiatePayment", () => {
  // happy path: contract with POST /payments
  it("calls POST /payments with correct amount, currency and session_id in metadata", async () => {
    let captured: any
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/payments`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okCreatePaymentResponse)
      })
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await yookassa.initiatePayment(baseInput)

    expect(captured.url).toBe(`${YOOKASSA_BASE_URL}/payments`)
    expect(captured.body.amount.value).toBe("1500.00")
    expect(captured.body.amount.currency).toBe("RUB") // must be uppercased
    expect(captured.body.metadata.session_id).toBe("cart_01HX")

    expect(result.id).toBe("payment_01HX")
    expect((result.data as any).confirmation.confirmation_url).toBe(
      okCreatePaymentResponse.confirmation.confirmation_url
    )
  })

  it("currency_code is uppercased in the request body", async () => {
    let captured: any
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/payments`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okCreatePaymentResponse)
      })
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    await yookassa.initiatePayment({ ...baseInput, currency_code: "usd" })

    expect(captured.body.amount.currency).toBe("USD")
  })

  it("passes description from options when not in input data", async () => {
    let captured: any
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/payments`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okCreatePaymentResponse)
      })
    )

    const yookassa = new (YookassaService as any)(
      { logger: makeLogger() },
      { ...baseOptions, paymentDescription: "Order payment" }
    )
    await yookassa.initiatePayment(baseInput)

    expect(captured.body.description).toBe("Order payment")
  })

  it("description from input.data overrides options.paymentDescription", async () => {
    let captured: any
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/payments`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okCreatePaymentResponse)
      })
    )

    const yookassa = new (YookassaService as any)(
      { logger: makeLogger() },
      { ...baseOptions, paymentDescription: "Options description" }
    )
    await yookassa.initiatePayment({
      ...baseInput,
      data: { ...baseInput.data, description: "Input description" },
    })

    expect(captured.body.description).toBe("Input description")
  })

  // capture flag
  describe("capture flag", () => {
    it.each<[any, boolean | undefined]>([
      [{ ...baseOptions, capture: true }, true],
      [{ ...baseOptions, capture: false }, false],
    ])("options.capture=%s → capture=%s in request", async (options, expectedCapture) => {
      let captured: any
      server.use(
        http.post(`${YOOKASSA_BASE_URL}/payments`, async ({ request }) => {
          captured = await captureRequest(request)
          return HttpResponse.json(okCreatePaymentResponse)
        })
      )

      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, options)
      await yookassa.initiatePayment(baseInput)

      expect(captured.body.capture).toBe(expectedCapture)
    })
  })

  // Receipt branching
  describe("receipt branching", () => {
    const cart = {
      email: "buyer@example.com",
      currency_code: "rub",
      shipping_total: 0,
      shipping_methods: [],
      shipping_address: { phone: "+71234567890", first_name: "Ivan", last_name: "Petrov" },
      items: [
        { product_title: "Item 1", unit_price: 1500, quantity: 1, total: 1500 },
      ],
    }

    it("useReceipt=true with cart → receipt is included in POST /payments body", async () => {
      let captured: any
      server.use(
        http.post(`${YOOKASSA_BASE_URL}/payments`, async ({ request }) => {
          captured = await captureRequest(request)
          return HttpResponse.json(okCreatePaymentResponse)
        })
      )

      const yookassa = new (YookassaService as any)(
        { logger: makeLogger() },
        {
          ...baseOptions,
          useReceipt: true,
          taxItemDefault: 1,
          taxShippingDefault: 1,
        }
      )
      await yookassa.initiatePayment({ ...baseInput, data: { ...baseInput.data, cart } })

      expect(captured.body.receipt).toBeDefined()
      expect(Array.isArray(captured.body.receipt.items)).toBe(true)
      expect(captured.body.receipt.items[0].description).toBe("Item 1")
      expect(captured.body.receipt.customer.email).toBe("buyer@example.com")
    })

    it("useReceipt=false → receipt is absent from POST /payments body", async () => {
      let captured: any
      server.use(
        http.post(`${YOOKASSA_BASE_URL}/payments`, async ({ request }) => {
          captured = await captureRequest(request)
          return HttpResponse.json(okCreatePaymentResponse)
        })
      )

      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
      await yookassa.initiatePayment({ ...baseInput, data: { ...baseInput.data, cart } })

      expect(captured.body.receipt).toBeUndefined()
    })

    it("useReceipt=true but no cart in data → receipt is absent (no crash)", async () => {
      let captured: any
      server.use(
        http.post(`${YOOKASSA_BASE_URL}/payments`, async ({ request }) => {
          captured = await captureRequest(request)
          return HttpResponse.json(okCreatePaymentResponse)
        })
      )

      const yookassa = new (YookassaService as any)(
        { logger: makeLogger() },
        {
          ...baseOptions,
          useReceipt: true,
          taxItemDefault: 1,
          taxShippingDefault: 1,
        }
      )

      const result = await yookassa.initiatePayment(baseInput) // no cart
      expect(result.id).toBe("payment_01HX")
      expect(captured.body.receipt).toBeUndefined()
    })
  })

  // confirmation object passthrough
  it("passes confirmation from input.data through to POST /payments body", async () => {
    let captured: any
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/payments`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okCreatePaymentResponse)
      })
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    await yookassa.initiatePayment({
      ...baseInput,
      data: {
        ...baseInput.data,
        confirmation: { type: "redirect", return_url: "https://shop.example.com/return" },
      },
    })

    expect(captured.body.confirmation).toEqual({
      type: "redirect",
      return_url: "https://shop.example.com/return",
    })
  })

  // receip_tmp in metadata
  it("always stores receip_tmp in metadata (even when useReceipt=false)", async () => {
    let captured: any
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/payments`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okCreatePaymentResponse)
      })
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    await yookassa.initiatePayment(baseInput)

    expect(captured.body.metadata).toBeDefined()
    expect(typeof captured.body.metadata.receip_tmp).toBe("string")
    // With no cart / no receipt the template is just an empty object string
    expect(captured.body.metadata.receip_tmp).toBe("{}")
  })

  // error wrapping
  describe("error wrapping", () => {
    it("wraps upstream HTTP errors with a clear message", async () => {
      server.use(
        http.post(`${YOOKASSA_BASE_URL}/payments`, () =>
          HttpResponse.json(
            { type: "error", id: "abc", code: "invalid_request", description: "boom" },
            { status: 400 }
          )
        )
      )

      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)

      await expect(yookassa.initiatePayment(baseInput)).rejects.toThrow(
        /An error occurred in initiatePayment/
      )
    })

    it("wraps network-level failures with a clear message", async () => {
      server.use(
        http.post(`${YOOKASSA_BASE_URL}/payments`, () => HttpResponse.error())
      )

      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)

      await expect(yookassa.initiatePayment(baseInput)).rejects.toThrow(
        /An error occurred in initiatePayment/
      )
    })
  })
})

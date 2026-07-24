import { http, HttpResponse } from "msw"
import TkassaService from "../../services/tkassa"
import { TKASSA_BASE_URL, captureRequest, makeLogger, server } from "./test-utils"

const okInitResponse = {
  Success: true,
  ErrorCode: "0",
  TerminalKey: "TestTerminalKey",
  Status: "NEW",
  PaymentId: "987654",
  OrderId: "cart_01HX",
  Amount: 150000,
  PaymentURL: "https://securepay.tinkoff.ru/x/abc",
}

const baseOptions = {
  terminalKey: "TestTerminalKey",
  password: "test_password",
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

describe("TkassaBase.initiatePayment", () => {
  // happy path: contract with /v2/Init
  it("calls /v2/Init with Amount in RUB, OrderId and credentials; strips Password from outgoing body", async () => {
    let captured: any
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/Init`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okInitResponse)
      })
    )

    const tkassa = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await tkassa.initiatePayment(baseInput)

    expect(captured.url).toBe(`${TKASSA_BASE_URL}/v2/Init`)
    expect(captured.body.Amount).toBe(150000) // 1500 RUB → 150000 kopecks
    expect(captured.body.OrderId).toBe("cart_01HX")
    expect(captured.body.TerminalKey).toBe("TestTerminalKey")
    expect(typeof captured.body.Token).toBe("string") // signed by t-kassa-api
    expect(captured.body.Token).toMatch(/^[a-f0-9]{64}$/)
    expect(captured.body.Password).toBeUndefined() // Password must NEVER leave the server

    expect(result.id).toBe("987654")
    expect((result.data as any).PaymentURL).toBe(okInitResponse.PaymentURL)
    expect((result.data as any).receipt).toEqual({})
  })

  it("passes SuccessURL and FailURL from input.data through to /v2/Init", async () => {
    let captured: any
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/Init`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okInitResponse)
      })
    )

    const tkassa = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)
    await tkassa.initiatePayment({
      ...baseInput,
      data: {
        ...baseInput.data,
        SuccessURL: "https://shop.example.com/payment/success",
        FailURL: "https://shop.example.com/payment/fail",
      },
    })

    expect(captured.body.SuccessURL).toBe("https://shop.example.com/payment/success")
    expect(captured.body.FailURL).toBe("https://shop.example.com/payment/fail")
  })

  // PayType is critical for two-step vs auto-capture flow
  describe("PayType selection", () => {
    it.each<[any, string]>([
      [{ ...baseOptions, capture: true }, "O"],
      [{ ...baseOptions, capture: false }, "T"],
      [{ terminalKey: "TestTerminalKey", password: "test_password" }, "O"], // undefined -> "O"
    ])("options=%o -> PayType=%s", async (options, expectedPayType) => {
      let captured: any
      server.use(
        http.post(`${TKASSA_BASE_URL}/v2/Init`, async ({ request }) => {
          captured = await captureRequest(request)
          return HttpResponse.json(okInitResponse)
        })
      )

      const tkassa = new (TkassaService as any)({ logger: makeLogger() }, options)
      await tkassa.initiatePayment(baseInput)

      expect(captured.body.PayType).toBe(expectedPayType)
    })

    it("data.PayType from input overrides options.capture", async () => {
      let captured: any
      server.use(
        http.post(`${TKASSA_BASE_URL}/v2/Init`, async ({ request }) => {
          captured = await captureRequest(request)
          return HttpResponse.json(okInitResponse)
        })
      )

      const tkassa = new (TkassaService as any)(
        { logger: makeLogger() },
        { ...baseOptions, capture: true }
      )
      await tkassa.initiatePayment({
        ...baseInput,
        data: { ...baseInput.data, PayType: "T" },
      })

      expect(captured.body.PayType).toBe("T")
    })
  })

  // Receipt branching
  describe("Receipt branching", () => {
    const cart = {
      email: "buyer@example.com",
      currency_code: "rub",
      shipping_total: 0,
      shipping_methods: [],
      shipping_address: { phone: "+71234567890", first_name: "A", last_name: "B" },
      items: [
        { product_title: "Item 1", unit_price: 1500, quantity: 1, total: 1500 },
      ],
    }

    it("useReceipt=true with cart → Receipt is included in /v2/Init body", async () => {
      let captured: any
      server.use(
        http.post(`${TKASSA_BASE_URL}/v2/Init`, async ({ request }) => {
          captured = await captureRequest(request)
          return HttpResponse.json(okInitResponse)
        })
      )

      const tkassa = new (TkassaService as any)(
        { logger: makeLogger() },
        {
          ...baseOptions,
          useReceipt: true,
          ffdVersion: "1.05",
          taxation: "osn",
          taxItemDefault: "none",
          taxShippingDefault: "none",
        }
      )
      await tkassa.initiatePayment({ ...baseInput, data: { ...baseInput.data, cart } })

      expect(captured.body.Receipt).toBeDefined()
      expect(captured.body.Receipt.FfdVersion).toBe("1.05")
      expect(captured.body.Receipt.Taxation).toBe("osn")
      expect(Array.isArray(captured.body.Receipt.Items)).toBe(true)
      expect(captured.body.Receipt.Items[0].Name).toBe("Item 1")
      expect(captured.body.Receipt.Items[0].Amount).toBe(150000)
    })

    it("useReceipt=false → Receipt is absent from /v2/Init body", async () => {
      let captured: any
      server.use(
        http.post(`${TKASSA_BASE_URL}/v2/Init`, async ({ request }) => {
          captured = await captureRequest(request)
          return HttpResponse.json(okInitResponse)
        })
      )

      const tkassa = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)
      await tkassa.initiatePayment({ ...baseInput, data: { ...baseInput.data, cart } })

      expect(captured.body.Receipt).toBeUndefined()
    })

    it("useReceipt=true but no cart in data → Receipt is absent (no crash)", async () => {
      let captured: any
      server.use(
        http.post(`${TKASSA_BASE_URL}/v2/Init`, async ({ request }) => {
          captured = await captureRequest(request)
          return HttpResponse.json(okInitResponse)
        })
      )

      const tkassa = new (TkassaService as any)(
        { logger: makeLogger() },
        {
          ...baseOptions,
          useReceipt: true,
          ffdVersion: "1.05",
          taxation: "osn",
          taxItemDefault: "none",
          taxShippingDefault: "none",
        }
      )

      const result = await tkassa.initiatePayment(baseInput) // no cart
      // The generator was not called; current implementation passes the empty `receipt = {}` object,
      // and t-kassa-api receives Receipt: {}. The important contract: no crash and result is returned.
      expect(result.id).toBe("987654")
      expect("Receipt" in captured.body ? Object.keys(captured.body.Receipt).length : 0).toBe(0)
    })
  })

  // error wrapping
  describe("error wrapping", () => {
    it("wraps upstream HTTP errors with a clear message", async () => {
      server.use(
        http.post(`${TKASSA_BASE_URL}/v2/Init`, () =>
          HttpResponse.json(
            { Success: false, ErrorCode: "9999", Message: "internal", Details: "boom" },
            { status: 500 }
          )
        )
      )

      const tkassa = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)

      await expect(tkassa.initiatePayment(baseInput)).rejects.toThrow(
        /An error occurred in initiatePayment/
      )
    })

    it("wraps network-level failures with a clear message", async () => {
      server.use(
        http.post(`${TKASSA_BASE_URL}/v2/Init`, () => HttpResponse.error())
      )

      const tkassa = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)

      await expect(tkassa.initiatePayment(baseInput)).rejects.toThrow(
        /An error occurred in initiatePayment/
      )
    })
  })
})

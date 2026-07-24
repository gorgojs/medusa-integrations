import { http, HttpResponse } from "msw"
import YookassaService from "../../services/yookassa"
import { YOOKASSA_BASE_URL, captureRequest, makeLogger, server } from "./test-utils"

const baseOptions = {
  shopId: "test_shop_id",
  secretKey: "test_secret_key",
} as any

const paymentId = "payment_01HX"

const basePaymentData = {
  id: paymentId,
  status: "waiting_for_capture",
  amount: { value: "1500.00", currency: "RUB" },
  metadata: { session_id: "cart_01HX", receip_tmp: "{}" },
}

const capturedPaymentData = {
  ...basePaymentData,
  status: "succeeded",
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("YookassaBase.capturePayment", () => {
  it("calls POST /payments/{id}/capture with the payment amount", async () => {
    let captured: any
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/payments/${paymentId}/capture`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(capturedPaymentData)
      })
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await yookassa.capturePayment({
      data: basePaymentData,
      context: { idempotency_key: "idem-capture-1" },
    } as any)

    expect(captured.url).toBe(`${YOOKASSA_BASE_URL}/payments/${paymentId}/capture`)
    expect(captured.body.amount).toEqual({ value: "1500.00", currency: "RUB" })

    expect((result.data as any).status).toBe("succeeded")
  })

  it("skips the API call and returns input when payment is already succeeded (auto-capture guard)", async () => {
    // No MSW handler registered — any accidental HTTP call would fail with
    // "onUnhandledRequest: error".
    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    const input = { data: { ...capturedPaymentData } }

    const result = await yookassa.capturePayment(input as any)

    expect(result).toEqual({ data: input })
  })

  it("wraps upstream HTTP errors with a clear message", async () => {
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/payments/${paymentId}/capture`, () =>
        HttpResponse.json(
          { type: "error", code: "invalid_request", description: "bad request" },
          { status: 400 }
        )
      )
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)

    await expect(
      yookassa.capturePayment({ data: basePaymentData } as any)
    ).rejects.toThrow(/An error occurred in capturePayment/)
  })
})

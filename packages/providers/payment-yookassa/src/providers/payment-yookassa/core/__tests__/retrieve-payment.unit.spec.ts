import { http, HttpResponse } from "msw"
import YookassaService from "../../services/yookassa"
import { YOOKASSA_BASE_URL, captureRequest, makeLogger, server } from "./test-utils"

const baseOptions = {
  shopId: "test_shop_id",
  secretKey: "test_secret_key",
} as any

const paymentId = "payment_01HX"

const okGetPaymentResponse = {
  id: paymentId,
  status: "succeeded",
  amount: { value: "1500.00", currency: "RUB" },
  metadata: { session_id: "cart_01HX", receip_tmp: "{}" },
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("YookassaBase.retrievePayment", () => {
  it("calls GET /payments/{id} and returns the upstream payload in data", async () => {
    let captured: any
    server.use(
      http.get(`${YOOKASSA_BASE_URL}/payments/${paymentId}`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okGetPaymentResponse)
      })
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await yookassa.retrievePayment({
      data: { id: paymentId },
    } as any)

    expect(captured.url).toBe(`${YOOKASSA_BASE_URL}/payments/${paymentId}`)
    expect((result.data as any).id).toBe(paymentId)
    expect((result.data as any).status).toBe("succeeded")
    expect((result.data as any).amount.value).toBe("1500.00")
  })

  it("wraps upstream HTTP errors with a clear message", async () => {
    server.use(
      http.get(`${YOOKASSA_BASE_URL}/payments/${paymentId}`, () =>
        HttpResponse.json(
          { type: "error", code: "not_found", description: "Payment not found" },
          { status: 404 }
        )
      )
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)

    await expect(
      yookassa.retrievePayment({ data: { id: paymentId } } as any)
    ).rejects.toThrow(/An error occurred in retrievePayment/)
  })
})

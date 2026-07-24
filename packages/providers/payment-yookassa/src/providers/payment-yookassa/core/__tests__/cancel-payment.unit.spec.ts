import { http, HttpResponse } from "msw"
import YookassaService from "../../services/yookassa"
import { YOOKASSA_BASE_URL, captureRequest, makeLogger, server } from "./test-utils"

const baseOptions = {
  shopId: "test_shop_id",
  secretKey: "test_secret_key",
} as any

const paymentId = "payment_01HX"

const okCancelResponse = {
  id: paymentId,
  status: "canceled",
  amount: { value: "1500.00", currency: "RUB" },
  metadata: { session_id: "cart_01HX", receip_tmp: "{}" },
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("YookassaBase.cancelPayment", () => {
  it("calls POST /payments/{id}/cancel with no extra body payload", async () => {
    let captured: any
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/payments/${paymentId}/cancel`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okCancelResponse)
      })
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await yookassa.cancelPayment({
      data: { id: paymentId },
    } as any)

    expect(captured.url).toBe(`${YOOKASSA_BASE_URL}/payments/${paymentId}/cancel`)
    expect((result.data as any).status).toBe("canceled")
    expect((result.data as any).id).toBe(paymentId)
  })

  it("passes idempotency key from context to the SDK", async () => {
    let capturedHeaders: Headers
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/payments/${paymentId}/cancel`, async ({ request }) => {
        capturedHeaders = request.headers
        return HttpResponse.json(okCancelResponse)
      })
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    await yookassa.cancelPayment({
      data: { id: paymentId },
      context: { idempotency_key: "idem-cancel-1" },
    } as any)

    // @a2seven/yoo-checkout forwards idempotency key as Idempotence-Key header
    expect(capturedHeaders!.get("Idempotence-Key")).toBe("idem-cancel-1")
  })

  it("wraps upstream HTTP errors with a clear message", async () => {
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/payments/${paymentId}/cancel`, () =>
        HttpResponse.json(
          { type: "error", code: "invalid_request", description: "bad state" },
          { status: 400 }
        )
      )
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)

    await expect(
      yookassa.cancelPayment({ data: { id: paymentId } } as any)
    ).rejects.toThrow(/An error occurred in cancelPayment/)
  })
})

import { http, HttpResponse } from "msw"
import YookassaService from "../../services/yookassa"
import { YOOKASSA_BASE_URL, captureRequest, makeLogger, server } from "./test-utils"

const baseOptions = {
  shopId: "test_shop_id",
  secretKey: "test_secret_key",
} as any

const paymentId = "payment_01HX"

// receip_tmp represents a compact receipt template stored in payment metadata.
// Matches the shape buildReceiptTemplate() produces (includes desc field).
const receiptTemplate = JSON.stringify({
  cur: "RUB",
  vat: 1,
  sub: "commodity",
  e: "buyer@example.com",
  desc: "Refund for order",
})

const basePaymentData = {
  id: paymentId,
  status: "succeeded",
  amount: { value: "1500.00", currency: "RUB" },
  metadata: { session_id: "cart_01HX", receip_tmp: receiptTemplate },
}

// The refundPayment method calls createRefund then retrievePayment (getPayment).
// Both handlers must be registered for each test.
function registerHandlers(refundResponse: object, paymentResponse: object) {
  server.use(
    http.post(`${YOOKASSA_BASE_URL}/refunds`, async () =>
      HttpResponse.json(refundResponse)
    ),
    http.get(`${YOOKASSA_BASE_URL}/payments/${paymentId}`, async () =>
      HttpResponse.json(paymentResponse)
    )
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("YookassaBase.refundPayment", () => {
  // Full refund — receipt is omitted
  it("full refund (amount === payment.amount.value) omits receipt from POST /refunds", async () => {
    let captured: any
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/refunds`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json({ id: "refund_01", status: "succeeded" })
      }),
      http.get(`${YOOKASSA_BASE_URL}/payments/${paymentId}`, async () =>
        HttpResponse.json(basePaymentData)
      )
    )

    const yookassa = new (YookassaService as any)(
      { logger: makeLogger() },
      { ...baseOptions, useReceipt: true }
    )
    await yookassa.refundPayment({ amount: 1500, data: basePaymentData } as any)

    expect(captured.url).toBe(`${YOOKASSA_BASE_URL}/refunds`)
    expect(captured.body.payment_id).toBe(paymentId)
    expect(captured.body.amount.value).toBe("1500") // BigNumber numeric toString
    expect(captured.body.amount.currency).toBe("RUB")
    // Full refund: refundAmount ("1500.00") equals payment.amount.value ("1500.00") → no receipt
    expect(captured.body.receipt).toBeUndefined()
  })

  // Partial refund — receipt is sent
  it("partial refund (amount < payment.amount.value) includes receipt when useReceipt=true", async () => {
    let captured: any
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/refunds`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json({ id: "refund_02", status: "succeeded" })
      }),
      http.get(`${YOOKASSA_BASE_URL}/payments/${paymentId}`, async () =>
        HttpResponse.json(basePaymentData)
      )
    )

    const yookassa = new (YookassaService as any)(
      { logger: makeLogger() },
      { ...baseOptions, useReceipt: true }
    )
    await yookassa.refundPayment({ amount: 500, data: basePaymentData } as any)

    expect(captured.body.amount.value).toBe("500")
    expect(captured.body.receipt).toBeDefined()
    expect(captured.body.receipt.items).toHaveLength(1)
    expect(captured.body.receipt.items[0].description).toBe("Refund for order")
    expect(captured.body.receipt.items[0].amount.value).toBe("500.00") // formatCurrency for RUB
    expect(captured.body.receipt.items[0].amount.currency).toBe("RUB")
  })

  it("partial refund with useReceipt=false → receipt is absent even for partial amount", async () => {
    let captured: any
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/refunds`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json({ id: "refund_03", status: "succeeded" })
      }),
      http.get(`${YOOKASSA_BASE_URL}/payments/${paymentId}`, async () =>
        HttpResponse.json(basePaymentData)
      )
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions) // no useReceipt
    await yookassa.refundPayment({ amount: 500, data: basePaymentData } as any)

    expect(captured.body.receipt).toBeUndefined()
  })

  it("throws when data.id is missing", async () => {
    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)

    await expect(
      yookassa.refundPayment({
        amount: 1500,
        data: { status: "succeeded", amount: { value: "1500.00", currency: "RUB" }, metadata: {} },
      } as any)
    ).rejects.toThrow(/No payment ID provided/)
  })

  it("retrieves the payment after creating the refund and returns it in output", async () => {
    registerHandlers(
      { id: "refund_04", status: "succeeded" },
      { ...basePaymentData, status: "succeeded" }
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await yookassa.refundPayment({
      amount: 1500,
      data: basePaymentData,
    } as any)

    expect((result.data as any).id).toBe(paymentId)
    expect((result.data as any).status).toBe("succeeded")
  })

  it("accepts BigNumberInput-shaped amount ({ value: '500' })", async () => {
    let captured: any
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/refunds`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json({ id: "refund_05", status: "succeeded" })
      }),
      http.get(`${YOOKASSA_BASE_URL}/payments/${paymentId}`, async () =>
        HttpResponse.json(basePaymentData)
      )
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    await yookassa.refundPayment({
      amount: { value: "500" },
      data: basePaymentData,
    } as any)

    expect(captured.body.amount.value).toBe("500")
  })

  it("passes idempotency key from context to createRefund", async () => {
    let capturedHeaders: Headers
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/refunds`, async ({ request }) => {
        capturedHeaders = request.headers
        return HttpResponse.json({ id: "refund_06", status: "succeeded" })
      }),
      http.get(`${YOOKASSA_BASE_URL}/payments/${paymentId}`, async () =>
        HttpResponse.json(basePaymentData)
      )
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    await yookassa.refundPayment({
      amount: 1500,
      data: basePaymentData,
      context: { idempotency_key: "idem-refund-1" },
    } as any)

    expect(capturedHeaders!.get("Idempotence-Key")).toBe("idem-refund-1")
  })

  it("wraps error from buildRefundReceiptSimple when metadata.receip_tmp is invalid JSON", async () => {
    const yookassa = new (YookassaService as any)(
      { logger: makeLogger() },
      { ...baseOptions, useReceipt: true }
    )

    // Partial refund with corrupted receip_tmp triggers buildRefundReceiptSimple which throws
    await expect(
      yookassa.refundPayment({
        amount: 500,
        data: {
          ...basePaymentData,
          amount: { value: "1500.00", currency: "RUB" },
          metadata: { session_id: "cart_01HX", receip_tmp: "NOT_VALID_JSON" },
        },
      } as any)
    ).rejects.toThrow(/Invalid receipt_tmp in metadata/)
  })

  it("wraps upstream errors from createRefund with a clear message", async () => {
    server.use(
      http.post(`${YOOKASSA_BASE_URL}/refunds`, () =>
        HttpResponse.json(
          { type: "error", code: "invalid_request", description: "bad refund" },
          { status: 400 }
        )
      )
    )

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)

    await expect(
      yookassa.refundPayment({ amount: 1500, data: basePaymentData } as any)
    ).rejects.toThrow(/An error occurred in refundPayment/)
  })
})

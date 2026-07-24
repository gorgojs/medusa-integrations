import { http, HttpResponse } from "msw"
import { PaymentSessionStatus } from "@medusajs/framework/utils"
import YookassaService from "../../services/yookassa"
import { YOOKASSA_BASE_URL, makeLogger, server } from "./test-utils"

const baseOptions = {
  shopId: "test_shop_id",
  secretKey: "test_secret_key",
} as any

const paymentId = "payment_01HX"

function makeGetPaymentHandler(status: string) {
  return http.get(`${YOOKASSA_BASE_URL}/payments/${paymentId}`, () =>
    HttpResponse.json({
      id: paymentId,
      status,
      amount: { value: "1500.00", currency: "RUB" },
      metadata: { session_id: "cart_01HX" },
    })
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("YookassaBase.getPaymentStatus", () => {
  it("throws when data.id is missing (undefined)", async () => {
    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)

    await expect(
      yookassa.getPaymentStatus({ data: {} } as any)
    ).rejects.toThrow(/No payment ID provided/)
  })

  it("throws when data.id is falsy (empty string)", async () => {
    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)

    await expect(
      yookassa.getPaymentStatus({ data: { id: "" } } as any)
    ).rejects.toThrow(/No payment ID provided/)
  })

  // YooKassa status → Medusa PaymentSessionStatus mapping
  it.each<[string, PaymentSessionStatus]>([
    ["pending", PaymentSessionStatus.PENDING],
    ["waiting_for_capture", PaymentSessionStatus.AUTHORIZED],
    ["succeeded", PaymentSessionStatus.CAPTURED],
    ["canceled", PaymentSessionStatus.CANCELED],
  ])("maps YooKassa status '%s' → Medusa %s", async (yookassaStatus, expectedMedusaStatus) => {
    server.use(makeGetPaymentHandler(yookassaStatus))

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await yookassa.getPaymentStatus({
      data: { id: paymentId },
    } as any)

    expect(result.status).toBe(expectedMedusaStatus)
    expect((result.data as any).id).toBe(paymentId)
  })

  it("falls back to PENDING for an unknown status not in the map", async () => {
    server.use(makeGetPaymentHandler("some_brand_new_status"))

    const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await yookassa.getPaymentStatus({
      data: { id: paymentId },
    } as any)

    expect(result.status).toBe(PaymentSessionStatus.PENDING)
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
      yookassa.getPaymentStatus({ data: { id: paymentId } } as any)
    ).rejects.toThrow(/An error occurred in getPaymentStatus/)
  })
})

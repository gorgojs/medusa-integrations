import { http, HttpResponse } from "msw"
import { PaymentSessionStatus } from "@medusajs/framework/utils"
import YookassaService from "../../services/yookassa"
import { YOOKASSA_BASE_URL, makeLogger, server } from "./test-utils"

const baseOptions = {
  shopId: "test_shop_id",
  secretKey: "test_secret_key",
} as any

const paymentId = "payment_01HX"

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("YookassaBase no-op / pass-through methods", () => {
  describe("authorizePayment", () => {
    it("delegates to getPaymentStatus and returns its mapped status", async () => {
      server.use(
        http.get(`${YOOKASSA_BASE_URL}/payments/${paymentId}`, () =>
          HttpResponse.json({
            id: paymentId,
            status: "waiting_for_capture",
            amount: { value: "1500.00", currency: "RUB" },
            metadata: { session_id: "cart_01HX" },
          })
        )
      )

      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
      const result = await yookassa.authorizePayment({
        data: { id: paymentId },
      } as any)

      expect(result.status).toBe(PaymentSessionStatus.AUTHORIZED)
    })
  })

  describe("deletePayment (YooKassa does not support delete)", () => {
    it("returns the input unchanged without making any HTTP call", async () => {
      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
      const input = { data: { id: paymentId, status: "succeeded" } }

      const result = await yookassa.deletePayment(input as any)

      expect(result).toEqual(input)
      // No server.use handler set — onUnhandledRequest: "error" would catch any accidental call.
    })
  })

  describe("updatePayment (YooKassa does not support update)", () => {
    it("returns the input unchanged without making any HTTP call", async () => {
      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
      const input = {
        amount: 1500,
        currency_code: "rub",
        data: { id: paymentId },
      }

      const result = await yookassa.updatePayment(input as any)

      expect(result).toEqual(input)
    })
  })
})

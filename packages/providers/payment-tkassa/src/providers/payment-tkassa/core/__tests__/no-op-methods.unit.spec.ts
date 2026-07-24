import { http, HttpResponse } from "msw"
import { PaymentSessionStatus } from "@medusajs/framework/utils"
import TkassaService from "../../services/tkassa"
import { TKASSA_BASE_URL, makeLogger, server } from "./test-utils"

const baseOptions = {
  terminalKey: "TestTerminalKey",
  password: "test_password",
} as any

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("TkassaBase no-op / pass-through methods", () => {
  describe("authorizePayment", () => {
    it("delegates to getPaymentStatus and returns its mapped status", async () => {
      server.use(
        http.post(`${TKASSA_BASE_URL}/v2/GetState`, () =>
          HttpResponse.json({
            Success: true,
            ErrorCode: "0",
            PaymentId: "987654",
            OrderId: "cart_01HX",
            Status: "AUTHORIZED",
            Amount: 150000,
          })
        )
      )

      const tkassa = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)
      const result = await tkassa.authorizePayment({
        data: { PaymentId: "987654" },
      } as any)

      expect(result.status).toBe(PaymentSessionStatus.AUTHORIZED)
    })
  })

  describe("deletePayment (T-Kassa does not support delete)", () => {
    it("returns the input unchanged without making any HTTP call", async () => {
      const tkassa = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)
      const input = { data: { PaymentId: "987654", receipt: { foo: "bar" } } }

      const result = await tkassa.deletePayment(input as any)

      expect(result).toEqual(input)
      // No `server.use(...)` handler set — MSW's onUnhandledRequest: "error"
      // would surface any accidental HTTP call.
    })
  })

  describe("updatePayment (T-Kassa does not support update)", () => {
    it("returns the input unchanged without making any HTTP call", async () => {
      const tkassa = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)
      const input = {
        amount: 1500,
        currency_code: "rub",
        data: { PaymentId: "987654" },
      }

      const result = await tkassa.updatePayment(input as any)

      expect(result).toEqual(input)
    })
  })
})

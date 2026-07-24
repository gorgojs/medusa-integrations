import { http, HttpResponse } from "msw"
import { PaymentSessionStatus } from "@medusajs/framework/utils"
import RobokassaService from "../../services/robokassa"
import { ROBOKASSA_BASE_URL, makeLogger, server } from "./test-utils"

const RETRIEVE_URL = `${ROBOKASSA_BASE_URL}/Merchant/WebService/Service.asmx/OpStateExt`

const baseOptions = {
  merchantLogin: "test_login",
  hashAlgorithm: "md5",
  password1: "test_password1",
  password2: "test_password2",
} as any

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("RobokassaBase no-op / pass-through methods", () => {
  describe("cancelPayment (not supported by Robokassa)", () => {
    it("returns the input unchanged without making any HTTP call", async () => {
      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
      const input = { data: { InvoiceID: "12345", OutSum: "15.00" } }

      const result = await robokassa.cancelPayment(input as any)

      expect(result).toEqual(input)
      // No server handler registered — onUnhandledRequest: "error" would surface accidental HTTP calls.
    })
  })

  describe("refundPayment (not supported by Robokassa)", () => {
    it("returns the input unchanged without making any HTTP call", async () => {
      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
      const input = {
        amount: 15,
        currency_code: "rub",
        data: { InvoiceID: "12345", OutSum: "15.00" },
      }

      const result = await robokassa.refundPayment(input as any)

      expect(result).toEqual(input)
    })
  })

  describe("deletePayment (not supported by Robokassa)", () => {
    it("returns the input unchanged without making any HTTP call", async () => {
      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
      const input = { data: { InvoiceID: "12345" } }

      const result = await robokassa.deletePayment(input as any)

      expect(result).toEqual(input)
    })
  })

  describe("updatePayment (not supported by Robokassa)", () => {
    it("returns the input unchanged without making any HTTP call", async () => {
      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
      const input = {
        amount: 20,
        currency_code: "rub",
        data: { InvoiceID: "12345" },
      }

      const result = await robokassa.updatePayment(input as any)

      expect(result).toEqual(input)
    })
  })

  describe("authorizePayment", () => {
    it("delegates to getPaymentStatus and returns the mapped status", async () => {
      server.use(
        http.post(RETRIEVE_URL, () =>
          new HttpResponse(
            `<?xml version="1.0" encoding="utf-8"?>
<OperationStateResponse>
  <Result><Code>0</Code><Description>OK</Description></Result>
  <State><Code>100</Code></State>
</OperationStateResponse>`,
            { headers: { "Content-Type": "text/xml; charset=utf-8" } }
          )
        )
      )

      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
      const result = await robokassa.authorizePayment({ data: { InvoiceID: "12345" } } as any)

      expect(result.status).toBe(PaymentSessionStatus.CAPTURED)
    })
  })
})

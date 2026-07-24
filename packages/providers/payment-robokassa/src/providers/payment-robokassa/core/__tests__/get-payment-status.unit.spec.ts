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

function makeXmlResponse(resultCode: number, stateCode: number) {
  return `<?xml version="1.0" encoding="utf-8"?>
<OperationStateResponse>
  <Result><Code>${resultCode}</Code><Description>OK</Description></Result>
  <State><Code>${stateCode}</Code></State>
</OperationStateResponse>`
}

function xmlHandler(resultCode: number, stateCode: number) {
  return http.post(RETRIEVE_URL, () =>
    new HttpResponse(makeXmlResponse(resultCode, stateCode), {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    })
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("RobokassaBase.getPaymentStatus", () => {
  describe("state code -> Medusa status mapping", () => {
    it.each<[number, PaymentSessionStatus]>([
      [100, PaymentSessionStatus.CAPTURED],
      [20, PaymentSessionStatus.AUTHORIZED],
      [5, PaymentSessionStatus.PENDING],
      [50, PaymentSessionStatus.PENDING],
      [3, PaymentSessionStatus.PENDING],
      [80, PaymentSessionStatus.REQUIRES_MORE],
      [10, PaymentSessionStatus.CANCELED],
      [60, PaymentSessionStatus.CANCELED],
    ])("state code %i -> %s", async (stateCode, expectedStatus) => {
      server.use(xmlHandler(0, stateCode))

      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
      const result = await robokassa.getPaymentStatus({ data: { InvoiceID: "12345" } } as any)

      expect(result.status).toBe(expectedStatus)
    })

    it("falls back to ERROR for an unknown state code", async () => {
      server.use(xmlHandler(0, 999))

      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
      const result = await robokassa.getPaymentStatus({ data: { InvoiceID: "12345" } } as any)

      expect(result.status).toBe(PaymentSessionStatus.ERROR)
    })
  })

  describe("Result.Code handling", () => {
    it("throws when Result.Code is non-zero", async () => {
      server.use(
        http.post(RETRIEVE_URL, () =>
          new HttpResponse(
            `<?xml version="1.0" encoding="utf-8"?>
<OperationStateResponse>
  <Result><Code>5</Code><Description>Invoice not found</Description></Result>
  <State><Code>0</Code></State>
</OperationStateResponse>`,
            { headers: { "Content-Type": "text/xml; charset=utf-8" } }
          )
        )
      )

      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)

      await expect(
        robokassa.getPaymentStatus({ data: { InvoiceID: "12345" } } as any)
      ).rejects.toThrow(/An error occurred in getPaymentStatus/)
    })
  })

  it("propagates input.data into output.data", async () => {
    server.use(xmlHandler(0, 100))

    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await robokassa.getPaymentStatus({
      data: { InvoiceID: "12345", OutSum: "15.00", Shp_SessionID: "cart_01HX" },
    } as any)

    expect(result.status).toBe(PaymentSessionStatus.CAPTURED)
    expect((result.data as any).InvoiceID).toBe("12345")
    expect((result.data as any).OutSum).toBe("15.00")
  })

  it("wraps HTTP errors with a clear message", async () => {
    server.use(
      http.post(RETRIEVE_URL, () =>
        HttpResponse.json({ code: "ERR" }, { status: 500 })
      )
    )

    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)

    await expect(
      robokassa.getPaymentStatus({ data: { InvoiceID: "12345" } } as any)
    ).rejects.toThrow(/An error occurred in getPaymentStatus/)
  })
})

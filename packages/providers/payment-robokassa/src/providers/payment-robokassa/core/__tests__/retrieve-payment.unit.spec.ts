import { http, HttpResponse } from "msw"
import { createHash } from "node:crypto"
import RobokassaService from "../../services/robokassa"
import { ROBOKASSA_BASE_URL, captureRequest, makeLogger, server } from "./test-utils"

const RETRIEVE_URL = `${ROBOKASSA_BASE_URL}/Merchant/WebService/Service.asmx/OpStateExt`

const baseOptions = {
  merchantLogin: "test_login",
  hashAlgorithm: "md5",
  password1: "test_password1",
  password2: "test_password2",
} as any

const okXmlResponse = `<?xml version="1.0" encoding="utf-8"?>
<OperationStateResponse>
  <Result><Code>0</Code><Description>OK</Description></Result>
  <State><Code>100</Code></State>
  <Info><OutSum>15.00</OutSum></Info>
</OperationStateResponse>`

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("RobokassaBase.retrievePayment", () => {
  it("POSTs to the OpStateExt endpoint with MerchantLogin, InvoiceID, and Signature", async () => {
    let captured: any
    server.use(
      http.post(RETRIEVE_URL, async ({ request }) => {
        captured = await captureRequest(request)
        return new HttpResponse(okXmlResponse, {
          headers: { "Content-Type": "text/xml; charset=utf-8" },
        })
      })
    )

    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    await robokassa.retrievePayment({ data: { InvoiceID: "12345" } } as any)

    expect(captured.queryParams.MerchantLogin).toBe("test_login")
    expect(captured.queryParams.InvoiceID).toBe("12345")
    expect(typeof captured.queryParams.Signature).toBe("string")
  })

  it("computes the correct md5 signature from [merchantLogin, invoiceId, password2]", async () => {
    let captured: any
    server.use(
      http.post(RETRIEVE_URL, async ({ request }) => {
        captured = await captureRequest(request)
        return new HttpResponse(okXmlResponse, {
          headers: { "Content-Type": "text/xml; charset=utf-8" },
        })
      })
    )

    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    await robokassa.retrievePayment({ data: { InvoiceID: "12345" } } as any)

    const expected = createHash("md5")
      .update("test_login:12345:test_password2")
      .digest("hex")
    expect(captured.queryParams.Signature).toBe(expected)
  })

  it("parses the XML response and returns it in data.response", async () => {
    server.use(
      http.post(RETRIEVE_URL, () =>
        new HttpResponse(okXmlResponse, {
          headers: { "Content-Type": "text/xml; charset=utf-8" },
        })
      )
    )

    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await robokassa.retrievePayment({ data: { InvoiceID: "12345" } } as any)

    const response = (result.data as any).response
    expect(response).toBeDefined()
    expect(response.Result).toBeDefined()
    expect(response.State).toBeDefined()
  })

  it("merges input.data into the output", async () => {
    server.use(
      http.post(RETRIEVE_URL, () =>
        new HttpResponse(okXmlResponse, {
          headers: { "Content-Type": "text/xml; charset=utf-8" },
        })
      )
    )

    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await robokassa.retrievePayment({
      data: { InvoiceID: "12345", OutSum: "15.00", Shp_SessionID: "cart_01HX" },
    } as any)

    expect((result.data as any).InvoiceID).toBe("12345")
    expect((result.data as any).OutSum).toBe("15.00")
    expect((result.data as any).Shp_SessionID).toBe("cart_01HX")
  })

  it("wraps upstream HTTP errors with a clear message", async () => {
    server.use(
      http.post(RETRIEVE_URL, () =>
        HttpResponse.json({ code: "ERR", description: "not found" }, { status: 404 })
      )
    )

    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)

    await expect(
      robokassa.retrievePayment({ data: { InvoiceID: "12345" } } as any)
    ).rejects.toThrow(/An error occurred in retrievePayment/)
  })
})

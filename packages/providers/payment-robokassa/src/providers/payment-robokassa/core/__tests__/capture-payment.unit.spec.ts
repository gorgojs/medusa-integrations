import { http, HttpResponse } from "msw"
import { createHash } from "node:crypto"
import RobokassaService from "../../services/robokassa"
import { ROBOKASSA_BASE_URL, captureRequest, makeLogger, server } from "./test-utils"

const CAPTURE_URL = `${ROBOKASSA_BASE_URL}/Merchant/Payment/Confirm`

const baseOptions = {
  merchantLogin: "test_login",
  hashAlgorithm: "md5",
  password1: "test_password1",
  password2: "test_password2",
} as any

const baseInput = {
  data: {
    InvoiceID: "12345",
    OutSum: "15.00",
  },
} as any

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("RobokassaBase.capturePayment", () => {
  it("POSTs to the capture endpoint with MerchantLogin, InvoiceID, OutSum, and SignatureValue", async () => {
    let captured: any
    server.use(
      http.post(CAPTURE_URL, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json({ ok: true })
      })
    )

    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    await robokassa.capturePayment(baseInput)

    expect(captured.queryParams.MerchantLogin).toBe("test_login")
    expect(captured.queryParams.InvoiceID).toBe("12345")
    expect(captured.queryParams.OutSum).toBe("15.00")
    expect(typeof captured.queryParams.SignatureValue).toBe("string")
    expect(captured.queryParams.SignatureValue).toMatch(/^[a-f0-9]+$/)
    // Password must never be sent in plaintext
    expect(captured.queryParams.password1).toBeUndefined()
    expect(captured.queryParams.Password).toBeUndefined()
  })

  it("computes the correct md5 signature from [merchantLogin, outSum, invoiceId, password1]", async () => {
    let captured: any
    server.use(
      http.post(CAPTURE_URL, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json({ ok: true })
      })
    )

    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    await robokassa.capturePayment(baseInput)

    const expected = createHash("md5")
      .update("test_login:15.00:12345:test_password1")
      .digest("hex")
    expect(captured.queryParams.SignatureValue).toBe(expected)
  })

  it("returns the upstream response body as output.data", async () => {
    const responseBody = { result: "ok", invoiceId: 12345 }
    server.use(
      http.post(CAPTURE_URL, () => HttpResponse.json(responseBody))
    )

    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await robokassa.capturePayment(baseInput)

    expect((result.data as any).result).toBe("ok")
    expect((result.data as any).invoiceId).toBe(12345)
  })

  it("wraps upstream HTTP errors with a clear message", async () => {
    server.use(
      http.post(CAPTURE_URL, () =>
        HttpResponse.json(
          { code: "ERR", description: "bad request" },
          { status: 400 }
        )
      )
    )

    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)

    await expect(robokassa.capturePayment(baseInput)).rejects.toThrow(
      /An error occurred in capturePayment/
    )
  })

  it("uses testPassword1 and sets isTest in URL when options.isTest is true", async () => {
    let captured: any
    server.use(
      http.post(CAPTURE_URL, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json({ ok: true })
      })
    )

    const robokassa = new (RobokassaService as any)(
      { logger: makeLogger() },
      { ...baseOptions, isTest: true, testPassword1: "test_password1_test" }
    )
    await robokassa.capturePayment(baseInput)

    const expected = createHash("md5")
      .update("test_login:15.00:12345:test_password1_test")
      .digest("hex")
    expect(captured.queryParams.SignatureValue).toBe(expected)
  })
})

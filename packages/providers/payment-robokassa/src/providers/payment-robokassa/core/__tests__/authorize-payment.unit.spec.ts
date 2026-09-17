import { http, HttpResponse } from "msw"
import { PaymentSessionStatus } from "@medusajs/framework/utils"
import { ROBOKASSA_BASE_URL, makeProvider, server } from "./test-utils"

const RETRIEVE_URL = `${ROBOKASSA_BASE_URL}/Merchant/WebService/Service.asmx/OpStateExt`

const baseOptions = {
  merchantLogin: "test_login",
  hashAlgorithm: "md5",
  password1: "test_password1",
  password2: "test_password2",
} as any

const testModeOptions = {
  ...baseOptions,
  isTest: true,
  testPassword1: "test_mode_password1",
  testPassword2: "test_mode_password2",
} as any

/** Robokassa's answer for a payment it has no record of, which is every test-mode payment. */
const NOT_FOUND = `<?xml version="1.0" encoding="utf-8"?>
<OperationStateResponse>
  <Result><Code>3</Code><Description>Не удалось найти операцию</Description></Result>
</OperationStateResponse>`

/** State code 20 is Robokassa's "authorized", per `PaymentStateCodesMap`. */
const AUTHORIZED = `<?xml version="1.0" encoding="utf-8"?>
<OperationStateResponse>
  <Result><Code>0</Code><Description>OK</Description></Result>
  <State><Code>20</Code></State>
</OperationStateResponse>`

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("RobokassaBase.authorizePayment", () => {
  describe("in test mode", () => {
    it("authorizes without asking Robokassa for a state it does not keep", async () => {
      let asked = false
      server.use(
        http.post(RETRIEVE_URL, () => {
          asked = true
          return new HttpResponse(NOT_FOUND, {
            headers: { "Content-Type": "text/xml; charset=utf-8" },
          })
        })
      )

      const robokassa = makeProvider(testModeOptions)
      const result = await robokassa.authorizePayment({
        data: { InvoiceID: "12345", isTest: "1" },
      } as any)

      expect(result.status).toBe(PaymentSessionStatus.AUTHORIZED)
      expect(asked).toBe(false)
    })

    it("keeps the session data it was given", async () => {
      const robokassa = makeProvider(testModeOptions)
      const result = await robokassa.authorizePayment({
        data: { InvoiceID: "12345", OutSum: "15.00" },
      } as any)

      expect(result.data).toEqual({ InvoiceID: "12345", OutSum: "15.00" })
    })
  })

  describe("in production", () => {
    it("asks Robokassa for the payment state", async () => {
      let asked = false
      server.use(
        http.post(RETRIEVE_URL, () => {
          asked = true
          return new HttpResponse(AUTHORIZED, {
            headers: { "Content-Type": "text/xml; charset=utf-8" },
          })
        })
      )

      const robokassa = makeProvider(baseOptions)
      const result = await robokassa.authorizePayment({
        data: { InvoiceID: "12345" },
      } as any)

      expect(asked).toBe(true)
      expect(result.status).toBe(PaymentSessionStatus.AUTHORIZED)
    })

    it("surfaces a refusal rather than authorizing on it", async () => {
      server.use(
        http.post(RETRIEVE_URL, () =>
          new HttpResponse(NOT_FOUND, {
            headers: { "Content-Type": "text/xml; charset=utf-8" },
          })
        )
      )

      const robokassa = makeProvider(baseOptions)

      await expect(
        robokassa.authorizePayment({ data: { InvoiceID: "12345" } } as any)
      ).rejects.toThrow(/Не удалось найти операцию/)
    })
  })
})

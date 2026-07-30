import crypto from "node:crypto"
import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { makeProvider } from "./test-utils"

const TERMINAL_KEY = "TestTerminalKey"
const PASSWORD = "test_password"

const baseOptions = { terminalKey: TERMINAL_KEY, password: PASSWORD } as any

/** Same algorithm as TkassaBase.isWebhookEventValid: 10 fixed keys + Password + sort + sha256. */
function signTkassaPayload(payload: Record<string, any>, password: string): string {
  const keys = [
    "TerminalKey", "OrderId", "Success", "Status", "PaymentId",
    "ErrorCode", "Amount", "CardId", "Pan", "ExpDate",
  ]
  const params: Record<string, string> = {}
  for (const k of keys) params[k] = String(payload[k])
  params.Password = password
  const sortedKeys = Object.keys(params).sort()
  let concat = ""
  for (const k of sortedKeys) concat += params[k]
  return crypto.createHash("sha256").update(concat).digest("hex")
}

function makeSignedPayload(overrides: Record<string, any> = {}) {
  const payload = {
    TerminalKey: TERMINAL_KEY,
    OrderId: "cart_01HX",
    Success: true,
    Status: "CONFIRMED",
    PaymentId: 987654,
    ErrorCode: "0",
    Amount: 150000,
    CardId: "0",
    Pan: "0",
    ExpDate: "0",
    ...overrides,
  } as Record<string, any>
  payload.Token = signTkassaPayload(payload, PASSWORD)
  return payload
}

function wrap(data: Record<string, any>) {
  return { data, rawData: Buffer.from(""), headers: {} }
}

describe("TkassaBase.getWebhookActionAndData", () => {
  describe("with a correctly signed payload", () => {
    it("maps CONFIRMED -> CAPTURED and converts Amount from kopecks to RUB", async () => {
      const tkassa = makeProvider(baseOptions)

      const result = await tkassa.getWebhookActionAndData(
        wrap(makeSignedPayload({ Status: "CONFIRMED", Amount: 150000 }))
      )

      expect(result.action).toBe(PaymentSessionStatus.CAPTURED)
      expect(result.data).toEqual({ session_id: "cart_01HX", amount: 1500 })
    })

    it.each<[string, PaymentSessionStatus]>([
      ["AUTHORIZED", PaymentSessionStatus.AUTHORIZED],
      ["REVERSED", PaymentSessionStatus.CANCELED],
      ["REFUNDED", PaymentSessionStatus.CANCELED],
      ["CANCELED", PaymentSessionStatus.CANCELED],
      ["REJECTED", PaymentSessionStatus.ERROR],
      ["AUTH_FAIL", PaymentSessionStatus.ERROR],
    ])("maps Status=%s -> action=%s", async (status, expectedAction) => {
      const tkassa = makeProvider(baseOptions)
      const result = await tkassa.getWebhookActionAndData(
        wrap(makeSignedPayload({ Status: status }))
      )
      expect(result.action).toBe(expectedAction)
    })

    it("returns ERROR action for a status absent from PaymentStatusesMap", async () => {
      const tkassa = makeProvider(baseOptions)
      const result = await tkassa.getWebhookActionAndData(
        wrap(makeSignedPayload({ Status: "SOMETHING_BRAND_NEW" }))
      )
      expect(result.action).toBe(PaymentSessionStatus.ERROR)
    })
  })

  describe("rejection cases", () => {
    it("returns NOT_SUPPORTED for a payload signed with the wrong password", async () => {
      const tkassa = makeProvider(baseOptions)

      const payload = makeSignedPayload()
      payload.Token = signTkassaPayload(payload, "wrong_password")

      const result = await tkassa.getWebhookActionAndData(wrap(payload))
      expect(result).toEqual({ action: PaymentActions.NOT_SUPPORTED })
    })

    it("returns NOT_SUPPORTED when Amount is tampered with after signing", async () => {
      const tkassa = makeProvider(baseOptions)

      const payload = makeSignedPayload()
      payload.Amount = 9999 // changed after Token computed

      const result = await tkassa.getWebhookActionAndData(wrap(payload))
      expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
    })

    it.each<[string, Record<string, any>]>([
      ["Status missing", { Status: undefined }],
      ["OrderId missing", { OrderId: undefined }],
      ["Amount missing", { Amount: undefined }],
    ])("returns NOT_SUPPORTED when required field is missing (%s)", async (_name, overrides) => {
      const tkassa = makeProvider(baseOptions)
      // Sign whatever we send so the failure reason is the field gate, not the Token check.
      const payload = makeSignedPayload(overrides)
      const result = await tkassa.getWebhookActionAndData(wrap(payload))
      expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
    })
  })
})

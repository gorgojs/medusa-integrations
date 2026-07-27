import crypto from "node:crypto"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { seedTkassaIntegration } from "../utils/seed-tkassa"

jest.setTimeout(120 * 1000)

const TERMINAL_KEY = process.env.TKASSA_TERMINAL_KEY
const PASSWORD = process.env.TKASSA_PASSWORD

const PROVIDER_ROUTE_KEY = "tkassa_tkassa"
const PROVIDER_DB_ID = "pp_tkassa_tkassa"

function buildTkassaWebhookToken(
  payload: Record<string, any>,
  password: string
): string {
  const keys = [
    "TerminalKey", "OrderId", "Success", "Status", "PaymentId",
    "ErrorCode", "Amount", "CardId", "Pan", "ExpDate",
  ]
  const params: Record<string, string> = {}
  for (const key of keys) {
    params[key] = String(payload[key])
  }
  params["Password"] = password
  const sortedKeys = Object.keys(params).sort()
  let concat = ""
  for (const key of sortedKeys) {
    concat += params[key]
  }
  return crypto.createHash("sha256").update(concat).digest("hex")
}

function makePayload(overrides: Partial<Record<string, any>> = {}) {
  return {
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
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    TKASSA_TERMINAL_KEY: TERMINAL_KEY,
    TKASSA_PASSWORD: PASSWORD,
  },
  testSuite: ({ api, getContainer }) => {
    describe("T-Kassa payment provider", () => {
      // Credentials/behaviour are no longer read from medusa-config — every payment
      // method now resolves them from the `integration` module at call time, so a
      // configured, enabled row has to exist before any of these tests can pass.
      beforeAll(async () => {
        await seedTkassaIntegration(getContainer())
      })

      it("is registered in the Payment module", async () => {
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        const providers = await paymentModule.listPaymentProviders()
        const ids = providers.map((p: any) => p.id)
        expect(ids).toContain(PROVIDER_DB_ID)
      })

      describe("POST /hooks/payment/tkassa_tkassa (route wiring)", () => {
        it("returns 200 for any well-formed POST (route is registered)", async () => {
          const response = await api.post(
            `/hooks/payment/${PROVIDER_ROUTE_KEY}`,
            { TerminalKey: TERMINAL_KEY, OrderId: "noop", Status: "NEW", Amount: 0 },
            { validateStatus: () => true }
          )
          expect(response.status).toBe(200)
        })
      })

      describe("paymentModule.getWebhookActionAndData (provider webhook validation)", () => {
        it("accepts a webhook signed with the correct Password and maps CONFIRMED to CAPTURED", async () => {
          const paymentModule: any = getContainer().resolve(Modules.PAYMENT)

          const payload = makePayload()
          payload.Token = buildTkassaWebhookToken(payload, PASSWORD)

          const result = await paymentModule.getWebhookActionAndData({
            provider: PROVIDER_ROUTE_KEY,
            payload: { data: payload, rawData: Buffer.from(""), headers: {} },
          })

          expect(result.action).toBe(PaymentSessionStatus.CAPTURED)
          expect(result.data).toEqual({ session_id: "cart_01HX", amount: 1500 })
        })

        it("rejects a webhook with a tampered Amount as NOT_SUPPORTED", async () => {
          const paymentModule: any = getContainer().resolve(Modules.PAYMENT)

          const payload = makePayload()
          payload.Token = buildTkassaWebhookToken(payload, PASSWORD)
          payload.Amount = 9999

          const result = await paymentModule.getWebhookActionAndData({
            provider: PROVIDER_ROUTE_KEY,
            payload: { data: payload, rawData: Buffer.from(""), headers: {} },
          })

          expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
        })

        it("rejects a webhook signed with the wrong Password as NOT_SUPPORTED", async () => {
          const paymentModule: any = getContainer().resolve(Modules.PAYMENT)

          const payload = makePayload()
          payload.Token = buildTkassaWebhookToken(payload, "wrong_password")

          const result = await paymentModule.getWebhookActionAndData({
            provider: PROVIDER_ROUTE_KEY,
            payload: { data: payload, rawData: Buffer.from(""), headers: {} },
          })

          expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
        })
      })
    })
  },
})

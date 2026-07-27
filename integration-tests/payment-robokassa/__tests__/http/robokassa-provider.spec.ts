import { createHash } from "node:crypto"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { seedRobokassaIntegration } from "../utils/seed-robokassa"

jest.setTimeout(120 * 1000)

const MERCHANT_LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN
const HASH_ALGORITHM = process.env.ROBOKASSA_HASH_ALGORITHM || "md5"
const PASSWORD_1 = process.env.ROBOKASSA_PASSWORD_1
const PASSWORD_2 = process.env.ROBOKASSA_PASSWORD_2

const PROVIDER_ROUTE_KEY = "robokassa_robokassa"
const PROVIDER_DB_ID = "pp_robokassa_robokassa"

/**
 * Replicates RobokassaBase.isWebhookEventValid:
 * raw = [OutSum, InvId, password2, "Shp_SessionID=<id>"]
 * filter falsy → join with ":" → hash with hashAlgorithm
 */
function signRobokassaWebhook(
  payload: { OutSum: string; InvId: string; Shp_SessionID: string },
  password2: string,
  algorithm: string
): string {
  const raw = [payload.OutSum, payload.InvId, password2, `Shp_SessionID=${payload.Shp_SessionID}`]
  return createHash(algorithm).update(raw.filter(Boolean).join(":")).digest("hex")
}

function makeWebhookPayload(overrides: Record<string, any> = {}) {
  const base = { OutSum: "15.00", InvId: "12345", Shp_SessionID: "cart_01HX" }
  const merged = { ...base, ...overrides }
  return {
    ...merged,
    SignatureValue: signRobokassaWebhook(merged, PASSWORD_2!, HASH_ALGORITHM),
    PaymentMethod: "BankCard",
    IncSum: merged.OutSum,
    IncCurrLabel: "BANKOCEAN2",
    EMAil: "buyer@example.com",
    Fee: "0",
    out_summ: merged.OutSum,
    inv_id: merged.InvId,
  }
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    ROBOKASSA_MERCHANT_LOGIN: MERCHANT_LOGIN,
    ROBOKASSA_HASH_ALGORITHM: HASH_ALGORITHM,
    ROBOKASSA_PASSWORD_1: PASSWORD_1,
    ROBOKASSA_PASSWORD_2: PASSWORD_2,
  },
  testSuite: ({ api, getContainer }) => {
    describe("Robokassa payment provider", () => {
      beforeAll(async () => {
        await seedRobokassaIntegration(getContainer())
      })

      it("is registered in the Payment module", async () => {
        const paymentModule = getContainer().resolve(Modules.PAYMENT)
        const providers = await paymentModule.listPaymentProviders()
        const ids = providers.map((p) => p.id)
        expect(ids).toContain(PROVIDER_DB_ID)
      })

      describe("POST /hooks/payment/robokassa_robokassa (route wiring)", () => {
        it("returns 200 for any well-formed POST (route is registered)", async () => {
          const response = await api.post(
            `/hooks/payment/${PROVIDER_ROUTE_KEY}`,
            { OutSum: "0", InvId: "0", SignatureValue: "noop", Shp_SessionID: "noop" },
            { validateStatus: () => true }
          )
          // Route exists — any 2xx is acceptable; 4xx would mean route not wired
          expect(response.status).toBe(200)
        })
      })

      describe("paymentModule.getWebhookActionAndData", () => {
        it("accepts a correctly signed webhook and returns SUCCESSFUL with amount as-is (no kopecks conversion)", async () => {
          const paymentModule = getContainer().resolve(Modules.PAYMENT)
          const payload = makeWebhookPayload({ OutSum: "15.00", InvId: "12345", Shp_SessionID: "cart_01HX" })

          const result = await paymentModule.getWebhookActionAndData({
            provider: PROVIDER_ROUTE_KEY,
            payload: { data: payload, rawData: Buffer.from(""), headers: {} },
          })

          expect(result.action).toBe(PaymentActions.SUCCESSFUL)
          // Amount is stored as Number("15.00") = 15, NOT converted to kopecks
          expect(result.data).toEqual({ session_id: "cart_01HX", amount: 15 })
        })

        it("rejects a webhook with a tampered OutSum as NOT_SUPPORTED", async () => {
          const paymentModule = getContainer().resolve(Modules.PAYMENT)
          const payload = makeWebhookPayload()
          payload.OutSum = "9999.00" // tampered after signing

          const result = await paymentModule.getWebhookActionAndData({
            provider: PROVIDER_ROUTE_KEY,
            payload: { data: payload, rawData: Buffer.from(""), headers: {} },
          })

          expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
        })

        it("rejects a webhook signed with the wrong password2 as NOT_SUPPORTED", async () => {
          const paymentModule = getContainer().resolve(Modules.PAYMENT)
          const base = { OutSum: "15.00", InvId: "12345", Shp_SessionID: "cart_01HX" }
          const payload = {
            ...base,
            SignatureValue: signRobokassaWebhook(base, "wrong_password", HASH_ALGORITHM),
            PaymentMethod: "BankCard",
          }

          const result = await paymentModule.getWebhookActionAndData({
            provider: PROVIDER_ROUTE_KEY,
            payload: { data: payload, rawData: Buffer.from(""), headers: {} },
          })

          expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
        })

        it("rejects a webhook with a tampered Shp_SessionID as NOT_SUPPORTED", async () => {
          const paymentModule = getContainer().resolve(Modules.PAYMENT)
          const payload = makeWebhookPayload()
          payload.Shp_SessionID = "other-session" // tampered after signing

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

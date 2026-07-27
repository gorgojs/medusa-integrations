import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { seedRobokassaIntegration } from "../utils/seed-robokassa"

jest.setTimeout(120 * 1000)

const MERCHANT_LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN
const HASH_ALGORITHM = process.env.ROBOKASSA_HASH_ALGORITHM
const PASSWORD_1 = process.env.ROBOKASSA_PASSWORD_1
const PASSWORD_2 = process.env.ROBOKASSA_PASSWORD_2

const PROVIDER_DB_ID = "pp_robokassa_robokassa"

/** Inline djb2-style hash — mirrors stringToNumberHash from robokassa utils. */
function stringToNumberHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    ROBOKASSA_MERCHANT_LOGIN: MERCHANT_LOGIN,
    ROBOKASSA_HASH_ALGORITHM: HASH_ALGORITHM,
    ROBOKASSA_PASSWORD_1: PASSWORD_1,
    ROBOKASSA_PASSWORD_2: PASSWORD_2,
  },
  testSuite: ({ getContainer }) => {
    describe("Robokassa payment lifecycle (e2e via PaymentModule)", () => {
      beforeAll(async () => {
        await seedRobokassaIntegration(getContainer())
      })

      it("createPaymentSession routes to RobokassaProvider.initiatePayment and persists paymentUrl", async () => {
        const paymentModule = getContainer().resolve(Modules.PAYMENT)

        const collection = await paymentModule.createPaymentCollections({
          currency_code: "rub",
          amount: 15,
        })

        const session = await paymentModule.createPaymentSession(collection.id, {
          provider_id: PROVIDER_DB_ID,
          currency_code: "rub",
          amount: 15,
          data: { session_id: "cart_e2e" },
        })

        expect(session.id).toMatch(/^payses_/)
        expect(session.provider_id).toBe(PROVIDER_DB_ID)

        const paymentUrl = session.data.paymentUrl as string
        expect(typeof paymentUrl).toBe("string")
        expect(paymentUrl).toMatch(/^https:\/\/auth\.robokassa\.ru\/Merchant\/Index\.aspx/)

        const url = new URL(paymentUrl)
        // MerchantLogin is the configured value
        expect(url.searchParams.get("MerchantLogin")).toBe(MERCHANT_LOGIN)
        // Amount is passed as a decimal string (NOT kopecks — Robokassa uses rubles)
        expect(url.searchParams.get("OutSum")).toBe("15.00")
        // Shp_SessionID is the Medusa payment session ID (Medusa sets data.session_id = session.id)
        expect(url.searchParams.get("Shp_SessionID")).toBe(session.id)
        // A signature must be present
        expect(url.searchParams.get("SignatureValue")).toMatch(/^[a-f0-9]+$/)
        // session.id from Medusa is the idempotency key; InvoiceID is its numeric hash
        const expectedInvoiceId = stringToNumberHash(session.id).toString()
        expect(url.searchParams.get("InvoiceID")).toBe(expectedInvoiceId)
      })

      it("amount 0.50 is represented as '0.50' in OutSum (decimal precision preserved)", async () => {
        const paymentModule = getContainer().resolve(Modules.PAYMENT)

        const collection = await paymentModule.createPaymentCollections({
          currency_code: "rub",
          amount: 0.5,
        })

        const session = await paymentModule.createPaymentSession(collection.id, {
          provider_id: PROVIDER_DB_ID,
          currency_code: "rub",
          amount: 0.5,
          data: { session_id: "cart_decimals" },
        })

        const url = new URL(session.data.paymentUrl as string)
        expect(url.searchParams.get("OutSum")).toBe("0.50")
      })

      it("capture=true (configured) does not add StepByStep to the payment URL", async () => {
        const paymentModule = getContainer().resolve(Modules.PAYMENT)

        const collection = await paymentModule.createPaymentCollections({
          currency_code: "rub",
          amount: 15,
        })

        const session = await paymentModule.createPaymentSession(collection.id, {
          provider_id: PROVIDER_DB_ID,
          currency_code: "rub",
          amount: 15,
          data: {},
        })

        const url = new URL(session.data.paymentUrl as string)
        // capture: true in medusa-config.ts → StepByStep must NOT appear
        expect(url.searchParams.get("StepByStep")).toBeNull()
      })

      it("useReceipt=true (configured) with no cart data → Receipt is included as encoded empty object", async () => {
        const paymentModule = getContainer().resolve(Modules.PAYMENT)

        const collection = await paymentModule.createPaymentCollections({
          currency_code: "rub",
          amount: 15,
        })

        const session = await paymentModule.createPaymentSession(collection.id, {
          provider_id: PROVIDER_DB_ID,
          currency_code: "rub",
          amount: 15,
          data: {},
        })

        const url = new URL(session.data.paymentUrl as string)
        // useReceipt: true in medusa-config.ts → Receipt param is always included
        const receiptParam = url.searchParams.get("Receipt")
        expect(receiptParam).not.toBeNull()
        // Without a cart, receipt is encoded as empty JSON object
        const receipt = JSON.parse(decodeURIComponent(receiptParam!))
        expect(typeof receipt).toBe("object")
      })
    })
  },
})

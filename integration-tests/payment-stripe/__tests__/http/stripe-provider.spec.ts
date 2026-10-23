import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, PaymentActions } from "@medusajs/framework/utils"
import { seedStripeIntegration } from "../utils/seed-stripe"
import { mockStripeNetwork, restoreStripeNetwork, STRIPE_PAYMENT_PROVIDER_ID, STRIPE_WEBHOOK_ROUTE } from "../utils/fixtures"
import { deliverWebhook, signedWebhook, STRIPE_PROVIDER_ROUTE_KEY, webhookEvent } from "../utils/webhooks"

jest.setTimeout(120 * 1000)

beforeAll(() => mockStripeNetwork())
afterAll(() => restoreStripeNetwork())

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Stripe payment provider", () => {
      beforeEach(async () => {
        await seedStripeIntegration(getContainer())
      })

      it("is registered in the Payment module", async () => {
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        const providers = await paymentModule.listPaymentProviders()

        expect(providers.map((p: any) => p.id)).toContain(STRIPE_PAYMENT_PROVIDER_ID)
      })

      it("answers 200 on the core webhook route", async () => {
        const { body, headers } = signedWebhook(webhookEvent("payment_intent.succeeded", { id: "pi_1" }))

        const res = await api.post(STRIPE_WEBHOOK_ROUTE, body, { headers, validateStatus: () => true })

        expect(res.status).toBe(200)
      })

      it("maps a delivery signed with the webhook secret, taking the raw body as it arrived", async () => {
        const event = webhookEvent("payment_intent.succeeded", {
          id: "pi_1",
          amount: 1000,
          amount_received: 1000,
          currency: "eur",
          metadata: { session_id: "payses_unknown" },
        })
        const { body, headers } = signedWebhook(event)

        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        const result = await paymentModule.getWebhookActionAndData({
          provider: STRIPE_PROVIDER_ROUTE_KEY,
          payload: { data: event, rawData: body, headers },
        })

        expect(result).toEqual({ action: PaymentActions.SUCCESSFUL, data: { session_id: "payses_unknown", amount: 10 } })
      })

      it("ignores a delivery signed with another secret", async () => {
        const event = webhookEvent("payment_intent.succeeded", {
          id: "pi_1",
          amount_received: 1000,
          currency: "eur",
          metadata: { session_id: "payses_unknown" },
        })
        const { body, headers } = signedWebhook(event, "whsec_someone_else")

        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        const result = await paymentModule.getWebhookActionAndData({
          provider: STRIPE_PROVIDER_ROUTE_KEY,
          payload: { data: event, rawData: body, headers },
        })

        expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
      })

      it("ignores an event that names no payment session", async () => {
        const result = await deliverWebhook(getContainer(), webhookEvent("payment_intent.succeeded", { id: "pi_1" }))

        expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
      })
    })
  },
})

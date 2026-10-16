import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, PaymentActions } from "@medusajs/framework/utils"
import { seedPayPalIntegration } from "../utils/seed-paypal"
import { mockPayPalNetwork, PAYPAL_PAYMENT_PROVIDER_ID, PAYPAL_WEBHOOK_ROUTE, restorePayPalNetwork } from "../utils/fixtures"
import { deliverWebhook, mockSignatureCheck, SIGNED_HEADERS, webhookEvent } from "../utils/webhooks"

jest.setTimeout(120 * 1000)

beforeAll(() => mockPayPalNetwork())
afterAll(() => restorePayPalNetwork())

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("PayPal payment provider", () => {
      beforeEach(async () => {
        await seedPayPalIntegration(getContainer())
      })

      it("is registered in the Payment module", async () => {
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        const providers = await paymentModule.listPaymentProviders()

        expect(providers.map((p: any) => p.id)).toContain(PAYPAL_PAYMENT_PROVIDER_ID)
      })

      it("answers 200 on the core webhook route", async () => {
        const res = await api.post(PAYPAL_WEBHOOK_ROUTE, webhookEvent("PAYMENT.CAPTURE.COMPLETED", {}), {
          validateStatus: () => true,
        })

        expect(res.status).toBe(200)
      })

      it("verifies a delivery with PayPal, sending the event as it arrived", async () => {
        const bodies = mockSignatureCheck("SUCCESS")
        const event = webhookEvent("PAYMENT.CAPTURE.COMPLETED", {
          id: "CAP-1",
          custom_id: "payses_unknown",
          amount: { currency_code: "EUR", value: "10.00" },
        })

        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        const result = await paymentModule.getWebhookActionAndData({
          provider: "paypal_paypal",
          payload: { data: event, rawData: Buffer.from(JSON.stringify(event)), headers: SIGNED_HEADERS },
        })

        expect(result).toEqual({ action: PaymentActions.SUCCESSFUL, data: { session_id: "payses_unknown", amount: "10.00" } })
        expect(JSON.parse(bodies[0])).toMatchObject({ webhook_id: "WH-TEST", transmission_id: "TX-1", webhook_event: event })
        expect(bodies[0]).toContain(`"webhook_event":${JSON.stringify(event)}`)
      })

      it("ignores a delivery PayPal does not confirm", async () => {
        mockSignatureCheck("FAILURE")

        const result = await deliverWebhook(
          getContainer(),
          webhookEvent("PAYMENT.CAPTURE.COMPLETED", { id: "CAP-1", custom_id: "payses_unknown" })
        )

        expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
      })
    })
  },
})

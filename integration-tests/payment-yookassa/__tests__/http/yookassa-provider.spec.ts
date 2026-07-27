const getPaymentSpy = jest.fn()
const getRefundSpy = jest.fn()

jest.mock("@a2seven/yoo-checkout", () => {
  const actual = jest.requireActual("@a2seven/yoo-checkout")
  return {
    ...actual,
    YooCheckout: jest.fn().mockImplementation(() => ({
      createPayment: jest.fn().mockResolvedValue({
        id: "payment_01HX",
        status: "pending",
        amount: { value: "1500.00", currency: "RUB" },
        confirmation: { type: "redirect", confirmation_url: "https://yookassa.ru/checkout/payments/abc" },
        metadata: { session_id: "cart_01HX", receip_tmp: "{}" },
      }),
      getPayment: getPaymentSpy,
      getRefund: getRefundSpy,
      capturePayment: jest.fn(),
      cancelPayment: jest.fn(),
      createRefund: jest.fn(),
    })),
  }
})

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, PaymentActions } from "@medusajs/framework/utils"
import { seedYookassaIntegration } from "../utils/seed-yookassa"

jest.setTimeout(120 * 1000)

const SHOP_ID = process.env.YOOKASSA_SHOP_ID
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY

const PROVIDER_ROUTE_KEY = "yookassa_yookassa"
const PROVIDER_DB_ID = "pp_yookassa_yookassa"

function makePaymentObject(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: "payment_01HX",
    status: "succeeded",
    amount: { value: "1500.00", currency: "RUB" },
    metadata: { session_id: "cart_01HX", receip_tmp: "{}" },
    ...overrides,
  } as Record<string, any>
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    YOOKASSA_SHOP_ID: SHOP_ID,
    YOOKASSA_SECRET_KEY: SECRET_KEY,
  },
  testSuite: ({ api, getContainer }) => {
    describe("YooKassa payment provider", () => {
      beforeAll(async () => {
        await seedYookassaIntegration(getContainer())
      })

      beforeEach(() => {
        getPaymentSpy.mockReset()
        getRefundSpy.mockReset()
      })

      it("is registered in the Payment module", async () => {
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        const providers = await paymentModule.listPaymentProviders()
        const ids = providers.map((p: any) => p.id)
        expect(ids).toContain(PROVIDER_DB_ID)
      })

      describe(`POST /hooks/payment/${PROVIDER_ROUTE_KEY} (route wiring)`, () => {
        it("returns 200 for any well-formed POST (route is registered)", async () => {
          getPaymentSpy.mockResolvedValue({ status: "succeeded" })

          const response = await api.post(
            `/hooks/payment/${PROVIDER_ROUTE_KEY}`,
            {
              type: "notification",
              event: "payment.succeeded",
              object: makePaymentObject(),
            },
            { validateStatus: () => true }
          )
          expect(response.status).toBe(200)
        })
      })

      describe("paymentModule.getWebhookActionAndData (provider webhook validation)", () => {
        it("payment.succeeded with matching status → SUCCESSFUL action", async () => {
          const paymentModule: any = getContainer().resolve(Modules.PAYMENT)

          getPaymentSpy.mockResolvedValue({ status: "succeeded" })

          const result = await paymentModule.getWebhookActionAndData({
            provider: PROVIDER_ROUTE_KEY,
            payload: {
              data: {
                type: "notification",
                event: "payment.succeeded",
                object: makePaymentObject({ status: "succeeded" }),
              },
              rawData: Buffer.from(""),
              headers: {},
            },
          })

          expect(result.action).toBe(PaymentActions.SUCCESSFUL)
          expect(result.data).toEqual({
            session_id: "cart_01HX",
            amount: "1500.00",
          })
        })

        it("payment.waiting_for_capture with matching status → AUTHORIZED action", async () => {
          const paymentModule: any = getContainer().resolve(Modules.PAYMENT)

          getPaymentSpy.mockResolvedValue({ status: "waiting_for_capture" })

          const result = await paymentModule.getWebhookActionAndData({
            provider: PROVIDER_ROUTE_KEY,
            payload: {
              data: {
                type: "notification",
                event: "payment.waiting_for_capture",
                object: makePaymentObject({ status: "waiting_for_capture" }),
              },
              rawData: Buffer.from(""),
              headers: {},
            },
          })

          expect(result.action).toBe(PaymentActions.AUTHORIZED)
          expect(result.data).toMatchObject({ session_id: "cart_01HX" })
        })

        it("payment.canceled with matching status → CANCELED action", async () => {
          const paymentModule: any = getContainer().resolve(Modules.PAYMENT)

          getPaymentSpy.mockResolvedValue({ status: "canceled" })

          const result = await paymentModule.getWebhookActionAndData({
            provider: PROVIDER_ROUTE_KEY,
            payload: {
              data: {
                type: "notification",
                event: "payment.canceled",
                object: makePaymentObject({ status: "canceled" }),
              },
              rawData: Buffer.from(""),
              headers: {},
            },
          })

          expect(result.action).toBe(PaymentActions.CANCELED)
          expect(result.data).toMatchObject({ session_id: "cart_01HX" })
        })

        it("tampered event (API returns different status) → NOT_SUPPORTED", async () => {
          const paymentModule: any = getContainer().resolve(Modules.PAYMENT)

          getPaymentSpy.mockResolvedValue({ status: "pending" })

          const result = await paymentModule.getWebhookActionAndData({
            provider: PROVIDER_ROUTE_KEY,
            payload: {
              data: {
                type: "notification",
                event: "payment.succeeded",
                object: makePaymentObject({ status: "succeeded" }),
              },
              rawData: Buffer.from(""),
              headers: {},
            },
          })

          expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
        })

        it("unknown object type in event → NOT_SUPPORTED", async () => {
          const paymentModule: any = getContainer().resolve(Modules.PAYMENT)

          const result = await paymentModule.getWebhookActionAndData({
            provider: PROVIDER_ROUTE_KEY,
            payload: {
              data: {
                type: "notification",
                event: "deal.succeeded",
                object: { id: "deal_01HX" },
              },
              rawData: Buffer.from(""),
              headers: {},
            },
          })

          expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
        })

        it("refund.succeeded with matching status → NOT_SUPPORTED (no refund action mapped)", async () => {
          const paymentModule: any = getContainer().resolve(Modules.PAYMENT)

          getRefundSpy.mockResolvedValue({ status: "succeeded" })

          const result = await paymentModule.getWebhookActionAndData({
            provider: PROVIDER_ROUTE_KEY,
            payload: {
              data: {
                type: "notification",
                event: "refund.succeeded",
                object: { id: "refund_01HX", status: "succeeded" },
              },
              rawData: Buffer.from(""),
              headers: {},
            },
          })

          expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
        })
      })
    })
  },
})

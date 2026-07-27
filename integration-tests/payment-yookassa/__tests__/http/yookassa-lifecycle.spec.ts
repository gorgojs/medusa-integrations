const createPaymentSpy = jest.fn()

jest.mock("@a2seven/yoo-checkout", () => {
  const actual = jest.requireActual("@a2seven/yoo-checkout")
  return {
    ...actual,
    YooCheckout: jest.fn().mockImplementation(() => ({
      createPayment: (params: any) => {
        createPaymentSpy(params)
        return Promise.resolve({
          id: "payment_01HX",
          status: "pending",
          amount: { value: params.amount.value, currency: params.amount.currency },
          confirmation: {
            type: "redirect",
            confirmation_url: "https://yookassa.ru/checkout/payments/abc",
          },
          metadata: { session_id: params.metadata?.session_id, receip_tmp: "{}" },
        })
      },
    })),
  }
})

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { seedYookassaIntegration } from "../utils/seed-yookassa"

jest.setTimeout(120 * 1000)

const SHOP_ID = process.env.YOOKASSA_SHOP_ID
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY
const PROVIDER_DB_ID = "pp_yookassa_yookassa"

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    YOOKASSA_SHOP_ID: SHOP_ID,
    YOOKASSA_SECRET_KEY: SECRET_KEY,
  },
  testSuite: ({ getContainer }) => {
    describe("YooKassa payment lifecycle (e2e via PaymentModule)", () => {
      beforeAll(async () => {
        await seedYookassaIntegration(getContainer())
      })
      beforeEach(() => createPaymentSpy.mockClear())

      it("createPaymentSession routes to YookassaService.initiatePayment and persists confirmation_url on the session", async () => {
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)

        const collection = await paymentModule.createPaymentCollections({
          region_id: "reg_e2e",
          currency_code: "rub",
          amount: 1500,
        })

        const session = await paymentModule.createPaymentSession(collection.id, {
          provider_id: PROVIDER_DB_ID,
          currency_code: "rub",
          amount: 1500,
          data: {},
        })

        expect(createPaymentSpy).toHaveBeenCalledTimes(1)
        const createParams = createPaymentSpy.mock.calls[0][0]

        expect(createParams.amount.value).toBe("1500.00")
        expect(createParams.amount.currency).toBe("RUB")

        expect(session.provider_id).toBe(PROVIDER_DB_ID)
        expect((session.data as any).id).toBe("payment_01HX")
        expect((session.data as any).confirmation.confirmation_url).toBe(
          "https://yookassa.ru/checkout/payments/abc"
        )
      })

      it("session.id is forwarded as metadata.session_id in createPayment payload", async () => {
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)

        const collection = await paymentModule.createPaymentCollections({
          region_id: "reg_e2e_2",
          currency_code: "rub",
          amount: 500,
        })

        const session = await paymentModule.createPaymentSession(collection.id, {
          provider_id: PROVIDER_DB_ID,
          currency_code: "rub",
          amount: 500,
          data: { session_id: "cart_01HX" },
        })

        expect(createPaymentSpy).toHaveBeenCalledTimes(1)
        const createParams = createPaymentSpy.mock.calls[0][0]
        expect(session.id).toMatch(/^payses_/)
        expect(createParams.metadata.session_id).toBe(session.id)
      })
    })
  },
})

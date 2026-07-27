// Mock t-kassa-api at the module boundary so we can intercept the Init call
// from inside Medusa's runtime without pulling MSW into the integration
// suite. MSW + Jest's --experimental-vm-modules (required by medusa
// integrationTestRunner) collide on rettime's .mjs build
const initSpy = jest.fn()

jest.mock("t-kassa-api", () => {
  const actual = jest.requireActual("t-kassa-api")
  return {
    ...actual,
    TKassa: jest.fn().mockImplementation(() => ({
      init: (params: any) => {
        initSpy(params)
        return Promise.resolve({
          Success: true,
          ErrorCode: "0",
          PaymentId: "987654",
          OrderId: params.OrderId,
          Status: "NEW",
          Amount: params.Amount,
          PaymentURL: "https://securepay.tinkoff.ru/x/abc",
        })
      },
    })),
  }
})

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { seedTkassaIntegration } from "../utils/seed-tkassa"

jest.setTimeout(120 * 1000)

const TERMINAL_KEY = process.env.TKASSA_TERMINAL_KEY
const PASSWORD = process.env.TKASSA_PASSWORD
const PROVIDER_DB_ID = "pp_tkassa_tkassa"

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    TKASSA_TERMINAL_KEY: TERMINAL_KEY,
    TKASSA_PASSWORD: PASSWORD,
  },
  testSuite: ({ getContainer }) => {
    describe("T-Kassa payment lifecycle (e2e via PaymentModule)", () => {
      beforeAll(async () => {
        await seedTkassaIntegration(getContainer())
      })
      beforeEach(() => initSpy.mockClear())

      it("createPaymentSession routes to TkassaProvider.initiatePayment and persists PaymentURL on the session", async () => {
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)

        // 1. A payment collection has to exist before we can attach sessions
        //    to it. region_id is a free-form string at the payment-module
        //    boundary (Medusa doesn't cross-check against the region module here).
        const collection = await paymentModule.createPaymentCollections({
          region_id: "reg_e2e",
          currency_code: "rub",
          amount: 1500,
        })

        // 2. createPaymentSession invokes the provider's initiatePayment
        //    internally — that's the call our mocked TKassa.init intercepts.
        const session = await paymentModule.createPaymentSession(collection.id, {
          provider_id: PROVIDER_DB_ID,
          currency_code: "rub",
          amount: 1500,
          data: {},
        })

        // Outgoing Init contract — same shape unit tests cover, but routed
        // through Medusa's container resolution this time.
        expect(initSpy).toHaveBeenCalledTimes(1)
        const initParams = initSpy.mock.calls[0][0]
        expect(initParams.Amount).toBe(150000) // 1500 RUB → 150000 kopecks
        // OrderId must equal Medusa's session id so the webhook can find it.
        expect(session.id).toMatch(/^payses_/)
        expect(initParams.OrderId).toBe(session.id)
        expect(initParams.TerminalKey).toBe(TERMINAL_KEY)
        // Password reaches t-kassa-api (which then strips it before HTTP).
        expect(initParams.Password).toBe(PASSWORD)

        // Returned data from /v2/Init must end up on the persisted session so
        // the storefront can redirect the customer to PaymentURL.
        expect(session.provider_id).toBe(PROVIDER_DB_ID)
        expect((session.data as any).PaymentURL).toBe("https://securepay.tinkoff.ru/x/abc")
        expect((session.data as any).PaymentId).toBe("987654")
      })
    })
  },
})

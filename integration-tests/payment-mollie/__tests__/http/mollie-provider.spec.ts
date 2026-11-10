import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { refreshPaymentCollectionForCartWorkflow } from "@medusajs/medusa/core-flows"
import nock from "nock"
import { seedMollieIntegration, MOLLIE_WEBHOOK_URL } from "../utils/seed-mollie"
import {
  createAdminHeaders,
  createMollieCart,
  createStoreHeaders,
  mockMollie,
  mockMollieNetwork,
  MOLLIE_PAYMENT_PROVIDER_ID,
  REDIRECT_URL,
  restoreMollieNetwork,
} from "../utils/fixtures"

jest.setTimeout(120 * 1000)

beforeAll(() => mockMollieNetwork())
afterAll(() => restoreMollieNetwork())

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Mollie payment provider", () => {
      let storeHeaders: Record<string, string>

      beforeEach(async () => {
        const adminHeaders = await createAdminHeaders(getContainer())
        storeHeaders = await createStoreHeaders(api, adminHeaders)
      })
      afterEach(() => {
        nock.abortPendingRequests()
        nock.cleanAll()
      })

      const createSession = (collectionId: string, data: Record<string, unknown>) =>
        api.post(
          `/store/payment-collections/${collectionId}/payment-sessions`,
          { provider_id: MOLLIE_PAYMENT_PROVIDER_ID, data },
          { headers: storeHeaders, validateStatus: () => true }
        )

      /** Every test seeds its own integration: the capture mode is one of its options. */
      const seed = (overrides: Record<string, unknown> = {}) => seedMollieIntegration(getContainer(), overrides)

      it("is registered in the Payment module", async () => {
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        const providers = await paymentModule.listPaymentProviders()

        expect(providers.map((p: any) => p.id)).toContain(MOLLIE_PAYMENT_PROVIDER_ID)
      })

      it("creates the Mollie payment with the cart's amount and addresses and stores the checkout URL", async () => {
        await seed()
        const mollie = mockMollie()
        const { cartId, collectionId } = await createMollieCart(getContainer())

        const res = await createSession(collectionId, { redirect_url: REDIRECT_URL, locale: "nl" })

        expect(res.status).toBe(200)
        const session = res.data.payment_collection.payment_sessions[0]
        const [create] = mollie.callsTo("POST", "/v2/payments")
        expect(mollie.callsTo("POST", "/v2/payments")).toHaveLength(1)
        expect(create.body).toMatchObject({
          amount: { currency: "EUR", value: "20.00" },
          description: `Cart ${cartId}`,
          redirectUrl: REDIRECT_URL,
          webhookUrl: MOLLIE_WEBHOOK_URL,
          locale: "nl_NL",
          metadata: { session_id: session.id, cart_id: cartId },
          billingAddress: {
            givenName: "Jan",
            familyName: "Jansen",
            email: "buyer@example.com",
            streetAndNumber: "Keizersgracht 126",
            postalCode: "1015 CW",
            city: "Amsterdam",
            country: "NL",
          },
          shippingAddress: { givenName: "Piet", streetAndNumber: "Prinsengracht 2", postalCode: "1015 DV", country: "NL" },
        })
        expect(create.body).not.toHaveProperty("captureMode")
        expect(create.body).not.toHaveProperty("method")
        expect(create.headers["idempotency-key"]).toEqual(expect.any(String))
        expect(create.headers["idempotency-key"].length).toBeGreaterThan(0)
        expect(create.headers.authorization).toBe(`Bearer ${process.env.MOLLIE_API_KEY}`)

        const payment = mollie.latest()
        expect(session.data).toMatchObject({
          id: payment.id,
          status: "open",
          mode: "test",
          session_id: session.id,
          amount: 20,
          currency_code: "eur",
          checkout_url: `https://www.mollie.com/checkout/select-method/${payment.id.slice(3)}`,
          redirect_url: REDIRECT_URL,
        })
      })

      // The SDK's own hook (hooks/mollie-hooks.js customizeUserAgent) writes the User-Agent and appends only
      // `customUserAgent`, so this checks what Mollie receives, not what the client was given.
      it("identifies itself to Mollie as GorgoMedusaMollie/<version>", async () => {
        await seed()
        const mollie = mockMollie()
        const { collectionId } = await createMollieCart(getContainer())

        await createSession(collectionId, { redirect_url: REDIRECT_URL })

        expect(mollie.callsTo("POST", "/v2/payments")[0].headers["user-agent"]).toMatch(/GorgoMedusaMollie\/\d+\.\d+\.\d+/)
      })

      it("sends captureMode manual when the integration is set to manual capture", async () => {
        await seed({ capture: "manual" })
        const mollie = mockMollie()
        const { collectionId } = await createMollieCart(getContainer())

        const res = await createSession(collectionId, { redirect_url: REDIRECT_URL })

        expect(res.status).toBe(200)
        expect(mollie.callsTo("POST", "/v2/payments")[0].body.captureMode).toBe("manual")
      })

      it("keeps only redirect_url and locale from the storefront's session data", async () => {
        await seed()
        const mollie = mockMollie()
        const { collectionId } = await createMollieCart(getContainer())

        const res = await createSession(collectionId, {
          redirect_url: REDIRECT_URL,
          amount: 0.01,
          webhookUrl: "https://evil.example.com/hook",
          billingAddress: { streetAndNumber: "forged" },
        })

        expect(res.status).toBe(200)
        const [create] = mollie.callsTo("POST", "/v2/payments")
        expect(create.body.amount.value).toBe("20.00")
        expect(create.body.webhookUrl).toBe(MOLLIE_WEBHOOK_URL)
        expect(create.body.billingAddress.streetAndNumber).toBe("Keizersgracht 126")
      })

      it("refuses a session without redirect_url and never calls Mollie", async () => {
        await seed()
        const mollie = mockMollie()
        const { collectionId } = await createMollieCart(getContainer())

        const res = await createSession(collectionId, {})

        expect(res.status).toBeGreaterThanOrEqual(400)
        expect(JSON.stringify(res.data)).toContain("redirect_url")
        expect(mollie.calls).toHaveLength(0)
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        expect(await paymentModule.listPaymentSessions({ payment_collection_id: collectionId })).toHaveLength(0)
      })

      it("tries to cancel the open Mollie payment when a change of the cart total deletes the session", async () => {
        await seed()
        const mollie = mockMollie()
        const { cartId, collectionId } = await createMollieCart(getContainer())
        await createSession(collectionId, { redirect_url: REDIRECT_URL })
        const payment = mollie.latest()
        expect(payment.status).toBe("open")

        const cartModule: any = getContainer().resolve(Modules.CART)
        const [item] = await cartModule.listLineItems({ cart_id: cartId })
        await cartModule.updateLineItems(item.id, { quantity: 2 })
        await refreshPaymentCollectionForCartWorkflow(getContainer()).run({ input: { cart_id: cartId } })

        // Mollie refuses to cancel an open payment, so it stays payable until it expires; the webhook
        // refunds it if the buyer pays it anyway (mollie-lifecycle.spec.ts, case 10)
        expect(mollie.callsTo("DELETE", `/v2/payments/${payment.id}`)).toHaveLength(1)
        expect(payment.status).toBe("open")
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        const collection = await paymentModule.retrievePaymentCollection(collectionId, { relations: ["payment_sessions"] })
        expect(collection.payment_sessions).toHaveLength(0)
      })

      it("deletes the session of a payment the buyer just paid without canceling it at Mollie", async () => {
        await seed()
        const mollie = mockMollie()
        const { cartId, collectionId } = await createMollieCart(getContainer())
        await createSession(collectionId, { redirect_url: REDIRECT_URL })
        // the buyer paid a moment ago: the provider reads the payment first and leaves a paid one alone
        mollie.pay(mollie.latest().id)

        const cartModule: any = getContainer().resolve(Modules.CART)
        const [item] = await cartModule.listLineItems({ cart_id: cartId })
        await cartModule.updateLineItems(item.id, { quantity: 2 })
        await refreshPaymentCollectionForCartWorkflow(getContainer()).run({ input: { cart_id: cartId } })

        expect(mollie.callsTo("DELETE", /.*/)).toHaveLength(0)
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        const collection = await paymentModule.retrievePaymentCollection(collectionId, { relations: ["payment_sessions"] })
        expect(collection.payment_sessions).toHaveLength(0)
      })
    })
  },
})

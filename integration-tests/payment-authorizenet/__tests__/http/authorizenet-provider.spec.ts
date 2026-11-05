import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, PaymentActions } from "@medusajs/framework/utils"
import { createPaymentSessionsWorkflow } from "@medusajs/medusa/core-flows"
import nock from "nock"
import { seedAuthorizeNetIntegration } from "../utils/seed-authorizenet"
import {
  AUTHORIZENET_PAYMENT_PROVIDER_ID,
  AUTHORIZENET_WEBHOOK_ROUTE,
  createAuthorizeNetCart,
  mockAnet,
  mockAnetNetwork,
  restoreAnetNetwork,
  transactionDetails,
} from "../utils/fixtures"
import { AUTHORIZENET_PROVIDER_ROUTE_KEY, deliverWebhook, signedWebhook, webhookEvent } from "../utils/webhooks"

jest.setTimeout(120 * 1000)

beforeAll(() => mockAnetNetwork())
afterAll(() => restoreAnetNetwork())

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Authorize.net payment provider", () => {
      beforeEach(async () => {
        await seedAuthorizeNetIntegration(getContainer())
      })
      afterEach(() => {
        nock.cleanAll()
      })

      const mapWebhook = (event: Record<string, unknown>, signed = signedWebhook(event)) => {
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        return paymentModule.getWebhookActionAndData({
          provider: AUTHORIZENET_PROVIDER_ROUTE_KEY,
          payload: { data: event, rawData: signed.body, headers: signed.headers },
        })
      }

      it("is registered in the Payment module", async () => {
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        const providers = await paymentModule.listPaymentProviders()

        expect(providers.map((p: any) => p.id)).toContain(AUTHORIZENET_PAYMENT_PROVIDER_ID)
      })

      it("answers 200 on the core webhook route", async () => {
        const { body, headers } = signedWebhook(
          webhookEvent("net.authorize.payment.fraud.approved", { id: "60001", merchantReferenceId: "payses_unknown" })
        )

        const res = await api.post(AUTHORIZENET_WEBHOOK_ROUTE, body, { headers, validateStatus: () => true })

        expect(res.status).toBe(200)
      })

      it("maps fraud.approved signed with the signature key, taking the raw body as it arrived", async () => {
        const { calls } = mockAnet({})
        const event = webhookEvent("net.authorize.payment.fraud.approved", {
          id: "60001",
          authAmount: 19.99,
          merchantReferenceId: "payses_unknown",
        })

        const result = await mapWebhook(event)

        expect(result).toEqual({
          action: PaymentActions.AUTHORIZED,
          data: { session_id: "payses_unknown", amount: 19.99 },
        })
        expect(calls).toEqual([])
      })

      it("reads the session from the transaction when a capture made elsewhere names none", async () => {
        const { calls } = mockAnet({
          getTransactionDetailsRequest: () => transactionDetails("capturedPendingSettlement", { transrefId: "payses_from_details" }),
        })
        const event = webhookEvent("net.authorize.payment.priorAuthCapture.created", { id: "60001", authAmount: 19.99 })

        const result = await mapWebhook(event)

        expect(result).toEqual({
          action: PaymentActions.SUCCESSFUL,
          data: { session_id: "payses_from_details", amount: 19.99 },
        })
        expect(calls.map((c) => c.root)).toEqual(["getTransactionDetailsRequest"])
        expect(calls[0].body.transId).toBe("60001")
      })

      it("ignores a delivery signed with another key", async () => {
        const { calls } = mockAnet({})
        const event = webhookEvent("net.authorize.payment.fraud.approved", { id: "60001", merchantReferenceId: "payses_unknown" })

        const result = await mapWebhook(event, signedWebhook(event, "someone-elses-signature-key"))

        expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
        expect(calls).toEqual([])
      })

      it("ignores an unsigned delivery and changes nothing for the session it names", async () => {
        const { calls } = mockAnet({})
        const { cartId, collectionId } = await createAuthorizeNetCart(getContainer())
        await createPaymentSessionsWorkflow(getContainer()).run({
          input: { payment_collection_id: collectionId, provider_id: AUTHORIZENET_PAYMENT_PROVIDER_ID },
        })
        const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
        const [session] = await paymentModule.listPaymentSessions({ payment_collection_id: collectionId })
        const event = webhookEvent("net.authorize.payment.fraud.approved", {
          id: "60001",
          authAmount: 19.99,
          merchantReferenceId: session.id,
        })
        const unsigned = { body: Buffer.from(JSON.stringify(event)), headers: { "content-type": "application/json" } }

        const mapped = await mapWebhook(event, unsigned as any)
        const res = await api.post(AUTHORIZENET_WEBHOOK_ROUTE, unsigned.body, {
          headers: unsigned.headers,
          validateStatus: () => true,
        })

        expect(mapped.action).toBe(PaymentActions.NOT_SUPPORTED)
        expect(res.status).toBe(200)
        const cartModule: any = getContainer().resolve(Modules.CART)
        expect((await cartModule.retrieveCart(cartId)).completed_at).toBeFalsy()
        const [after] = await paymentModule.listPaymentSessions({ payment_collection_id: collectionId })
        expect(after.status).toBe("pending")
        expect(await paymentModule.listPayments({ payment_collection_id: collectionId })).toHaveLength(0)
        expect(calls).toEqual([])
      })

      it("ignores an event that names no payment session", async () => {
        mockAnet({ getTransactionDetailsRequest: () => transactionDetails("authorizedPendingCapture") })

        const result = await deliverWebhook(
          getContainer(),
          webhookEvent("net.authorize.payment.priorAuthCapture.created", { id: "60001" })
        )

        expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
      })
    })
  },
})

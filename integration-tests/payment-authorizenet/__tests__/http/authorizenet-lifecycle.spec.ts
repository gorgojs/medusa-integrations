/**
 * The whole Authorize.net payment cycle through the store and admin APIs: a session carrying the
 * Accept.js token → cart completion runs the transaction → capture → refunds before and after
 * settlement → void, plus a transaction held for review and released by a webhook, a capture made in
 * the Merchant Interface, and payments created by the vendor's `payment-authorizenet-medusa`.
 *
 * The provider runs from the built package; nock plays Authorize.net and records what it was sent.
 * A request with no responder gets a 500 naming it, which fails the step that sent it.
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { refreshPaymentCollectionForCartWorkflow } from "@medusajs/medusa/core-flows"
import nock from "nock"
import {
  approvedTransaction,
  AUTHORIZENET_PAYMENT_PROVIDER_ID,
  createAdminHeaders,
  createAuthorizeNetCart,
  createStoreHeaders,
  declinedTransaction,
  mockAnet,
  mockAnetNetwork,
  restoreAnetNetwork,
  transactionDetails,
} from "../utils/fixtures"
import { seedAuthorizeNetIntegration } from "../utils/seed-authorizenet"
import { deliverWebhook, webhookEvent } from "../utils/webhooks"

jest.setTimeout(180 * 1000)

const OPAQUE_DATA = { dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT", dataValue: "eyJ0b2tlbiI6Im5vY2sifQ==" }
const TRANS_ID = "60001"

beforeAll(() => mockAnetNetwork())
afterAll(() => restoreAnetNetwork())

/** The transaction requests Authorize.net received, without the merchant authentication. */
const transactions = (calls: { root: string; body: any }[]) =>
  calls.filter((call) => call.root === "createTransactionRequest").map((call) => ({ refId: call.body.refId, ...call.body.transactionRequest }))

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let adminHeaders: Record<string, string>
    let storeHeaders: Record<string, string>

    beforeEach(async () => {
      adminHeaders = await createAdminHeaders(getContainer())
      storeHeaders = await createStoreHeaders(api, adminHeaders)
    })
    afterEach(() => {
      nock.abortPendingRequests()
      nock.cleanAll()
    })

    const createSession = async (collectionId: string, data: Record<string, unknown> = { opaque_data: OPAQUE_DATA }) => {
      const res = await api.post(
        `/store/payment-collections/${collectionId}/payment-sessions`,
        { provider_id: AUTHORIZENET_PAYMENT_PROVIDER_ID, data },
        { headers: storeHeaders, validateStatus: () => true }
      )
      if (res.status !== 200) {
        throw new Error(`payment session: ${res.status} ${JSON.stringify(res.data)}`)
      }
      return res.data.payment_collection.payment_sessions[0]
    }

    const completeCart = (cartId: string) =>
      api.post(`/store/carts/${cartId}/complete`, {}, { headers: storeHeaders, validateStatus: () => true })

    const listPayments = async (collectionId: string) => {
      const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
      return paymentModule.listPayments({ payment_collection_id: collectionId }, { relations: ["captures", "refunds"] })
    }

    const retrieveSession = async (sessionId: string) => {
      const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
      return paymentModule.retrievePaymentSession(sessionId)
    }

    /**
     * Authorize.net as a small state machine over one transaction: the transaction request moves the
     * status, `getTransactionDetails` reports it.
     */
    const gateway = (initial: { status?: string; transrefId?: string } = {}) => {
      const state = { status: initial.status ?? "authorizedPendingCapture", transrefId: initial.transrefId, refunds: 0 }
      const mock = mockAnet({
        createTransactionRequest: (body) => {
          const request = body.transactionRequest
          state.transrefId ??= body.refId
          switch (request.transactionType) {
            case "authCaptureTransaction":
              state.status = "capturedPendingSettlement"
              return approvedTransaction({ transId: TRANS_ID })
            case "authOnlyTransaction":
              state.status = "authorizedPendingCapture"
              return approvedTransaction({ transId: TRANS_ID })
            case "priorAuthCaptureTransaction":
              state.status = "capturedPendingSettlement"
              return approvedTransaction({ transId: TRANS_ID })
            case "voidTransaction":
              state.status = "voided"
              return approvedTransaction({ transId: TRANS_ID })
            case "refundTransaction":
              state.refunds += 1
              return approvedTransaction({ transId: `7000${state.refunds}` })
            default:
              throw new Error(`unexpected transaction ${request.transactionType}`)
          }
        },
        getTransactionDetailsRequest: () => transactionDetails(state.status, { transrefId: state.transrefId }),
      })
      return { state, calls: mock.calls }
    }

    /** A cart completed with a token, in the given capture mode. */
    const paidOrder = async (capture: "automatic" | "manual") => {
      await seedAuthorizeNetIntegration(getContainer(), { capture })
      const { cartId, collectionId } = await createAuthorizeNetCart(getContainer())
      const anet = gateway()
      const session = await createSession(collectionId)
      const res = await completeCart(cartId)
      expect(res.status).toBe(200)
      expect(res.data.type).toBe("order")
      const [payment] = await listPayments(collectionId)
      return { anet, session, cartId, collectionId, order: res.data.order, payment }
    }

    it("1. keeps only the token from the storefront's session data", async () => {
      await seedAuthorizeNetIntegration(getContainer())
      const { collectionId } = await createAuthorizeNetCart(getContainer())
      const anet = gateway()

      const session = await createSession(collectionId, {
        opaque_data: OPAQUE_DATA,
        amount: 0.01,
        cart: { billing_address: { address_1: "forged" } },
      })

      expect(anet.calls).toHaveLength(0)
      expect(session.data).toMatchObject({ amount: 19.99, currency_code: "usd", opaque_data: OPAQUE_DATA })
      expect(session.data.cart).toBeNull()
    })

    it("2. captures right away on completion, from Medusa's amount and the cart's addresses (regressions В1, В2, В9)", async () => {
      const { anet, session, payment } = await paidOrder("automatic")

      const [sent] = transactions(anet.calls)
      expect(sent).toMatchObject({
        refId: session.id,
        transactionType: "authCaptureTransaction",
        amount: "19.99",
        currencyCode: "USD",
        payment: { opaqueData: OPAQUE_DATA },
        customer: { email: "buyer@example.com" },
        billTo: { firstName: "Anna", address: "1 Market St", city: "San Francisco", state: "CA", zip: "94105", country: "US" },
        shipTo: { address: "350 5th Ave", city: "New York", state: "NY", zip: "10118", country: "US" },
      })
      expect(sent.userFields.userField[0]).toEqual({ name: "medusa_session_id", value: session.id })
      expect(payment.captures).toHaveLength(1)
      expect(payment.data).toMatchObject({ transId: TRANS_ID, card_brand: "visa", card_last4: "1111", opaque_data: null })
    })

    it("3. only authorizes in manual mode and captures the whole amount from Admin", async () => {
      const { anet, payment } = await paidOrder("manual")
      expect(transactions(anet.calls)[0].transactionType).toBe("authOnlyTransaction")
      expect(payment.captures).toHaveLength(0)

      const res = await api.post(`/admin/payments/${payment.id}/capture`, {}, { headers: adminHeaders })

      expect(res.status).toBe(200)
      const capture = transactions(anet.calls)[1]
      expect(capture).toMatchObject({ transactionType: "priorAuthCaptureTransaction", refTransId: TRANS_ID })
      expect(capture).not.toHaveProperty("amount")
      expect(capture.refId).toMatch(/^capt_/)
      const [captured] = await listPayments(payment.payment_collection_id)
      expect(captured.captures).toHaveLength(1)
    })

    it("4. hands a decline back to the storefront with Authorize.net's text and creates no order", async () => {
      await seedAuthorizeNetIntegration(getContainer())
      const { cartId, collectionId } = await createAuthorizeNetCart(getContainer())
      mockAnet({ createTransactionRequest: () => declinedTransaction("2", "This transaction has been declined.") })
      await createSession(collectionId)

      const res = await completeCart(cartId)

      expect(res.status).toBe(200)
      expect(res.data.type).toBe("cart")
      expect(res.data.error.message).toContain("This transaction has been declined.")
      expect(await listPayments(collectionId)).toHaveLength(0)
    })

    it("5. lets an order wait for a held transaction, then authorizes it on fraud.approved (regression В5)", async () => {
      await seedAuthorizeNetIntegration(getContainer(), { capture: "manual" })
      const { cartId, collectionId } = await createAuthorizeNetCart(getContainer())
      // the Fraud Detection Suite holds the transaction (4) until the merchant decides
      const held: { status: string; transrefId?: string } = { status: "FDSPendingReview" }
      const routed = mockAnet({
        createTransactionRequest: (body) => {
          held.transrefId = body.refId
          return approvedTransaction({ responseCode: "4", transId: TRANS_ID })
        },
        getTransactionDetailsRequest: () => transactionDetails(held.status, { transrefId: held.transrefId }),
      })
      const session = await createSession(collectionId)

      const res = await completeCart(cartId)

      expect(res.status).toBe(200)
      expect(res.data.type).toBe("order")
      expect(await listPayments(collectionId)).toHaveLength(0)
      const waiting = await retrieveSession(session.id)
      expect(waiting.status).toBe(PaymentSessionStatus.PENDING_AUTHORIZATION)
      expect(waiting.data).toMatchObject({ transId: TRANS_ID, held: true, opaque_data: null })

      held.status = "authorizedPendingCapture"
      const result = await deliverWebhook(
        getContainer(),
        webhookEvent("net.authorize.payment.fraud.approved", {
          id: TRANS_ID,
          merchantReferenceId: session.id,
          authAmount: 19.99,
          responseCode: 1,
        })
      )

      expect(result).toMatchObject({ action: PaymentActions.AUTHORIZED, data: { session_id: session.id, amount: 19.99 } })
      const [payment] = await listPayments(collectionId)
      expect(payment).toBeDefined()
      expect(payment.data).toMatchObject({ transId: TRANS_ID, transactionStatus: "authorizedPendingCapture" })
      // one transaction only: the approval read the status, it did not charge again
      expect(transactions(routed.calls)).toHaveLength(1)
    })

    describe("refunds", () => {
      it("6. voids the payment for a full refund before settlement", async () => {
        const { anet, payment } = await paidOrder("automatic")

        const res = await api.post(`/admin/payments/${payment.id}/refund`, { amount: 19.99 }, { headers: adminHeaders })

        expect(res.status).toBe(200)
        expect(transactions(anet.calls)[1]).toMatchObject({ transactionType: "voidTransaction", refTransId: TRANS_ID })
        const [refunded] = await listPayments(payment.payment_collection_id)
        expect(refunded.refunds).toHaveLength(1)
        expect(refunded.data).toMatchObject({ transactionStatus: "voided", refunds: [{ amount: 19.99, voided: true }] })
      })

      it("7. refuses a partial refund before settlement with the reason", async () => {
        const { anet, payment } = await paidOrder("automatic")

        const res = await api.post(
          `/admin/payments/${payment.id}/refund`,
          { amount: 5 },
          { headers: adminHeaders, validateStatus: () => true }
        )

        expect(res.status).toBeGreaterThanOrEqual(400)
        expect(JSON.stringify(res.data)).toContain("Authorize.net settles payments once a day")
        expect(transactions(anet.calls)).toHaveLength(1)
        const [payment_] = await listPayments(payment.payment_collection_id)
        expect(payment_.refunds).toHaveLength(0)
      })

      it("8. refunds part of a settled payment twice, both against the payment's transaction (regression В3)", async () => {
        const { anet, payment } = await paidOrder("automatic")
        anet.state.status = "settledSuccessfully"

        await api.post(`/admin/payments/${payment.id}/refund`, { amount: 5 }, { headers: adminHeaders })
        await api.post(`/admin/payments/${payment.id}/refund`, { amount: 2.5 }, { headers: adminHeaders })

        const refunds = transactions(anet.calls).filter((t) => t.transactionType === "refundTransaction")
        expect(refunds.map((r) => ({ amount: r.amount, refTransId: r.refTransId, card: r.payment.creditCard }))).toEqual([
          { amount: "5.00", refTransId: TRANS_ID, card: { cardNumber: "1111", expirationDate: "XXXX" } },
          { amount: "2.50", refTransId: TRANS_ID, card: { cardNumber: "1111", expirationDate: "XXXX" } },
        ])
        expect(refunds[0].refId).toMatch(/^ref_/)
        expect(refunds[0].refId).not.toBe(refunds[1].refId)
        const [refunded] = await listPayments(payment.payment_collection_id)
        expect(refunded.refunds).toHaveLength(2)
        expect(refunded.data.transId).toBe(TRANS_ID)
        expect(refunded.data.refunds.map((r: any) => r.transId)).toEqual(["70001", "70002"])
      })
    })

    it("9. voids the authorization when the order is canceled (regression В4)", async () => {
      const { anet, order } = await paidOrder("manual")

      const res = await api.post(`/admin/orders/${order.id}/cancel`, {}, { headers: adminHeaders })

      expect(res.status).toBe(200)
      expect(transactions(anet.calls)[1]).toMatchObject({ transactionType: "voidTransaction", refTransId: TRANS_ID })
    })

    it("10. drops a session that never reached Authorize.net without calling it when the cart changes", async () => {
      await seedAuthorizeNetIntegration(getContainer())
      const { cartId, collectionId } = await createAuthorizeNetCart(getContainer())
      const anet = gateway()
      await createSession(collectionId)

      const cartModule: any = getContainer().resolve(Modules.CART)
      const [item] = await cartModule.listLineItems({ cart_id: cartId })
      await cartModule.updateLineItems(item.id, { quantity: 2 })
      await refreshPaymentCollectionForCartWorkflow(getContainer()).run({ input: { cart_id: cartId } })

      expect(anet.calls).toHaveLength(0)
      const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
      const collection = await paymentModule.retrievePaymentCollection(collectionId, { relations: ["payment_sessions"] })
      expect(collection.payment_sessions).toHaveLength(0)
    })

    it("11. captures and refunds a payment created by the vendor's plugin", async () => {
      const { anet, payment } = await paidOrder("manual")
      // what payment-authorizenet-medusa left in payment.data: its transactionResponse, no currency
      const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
      await paymentModule.updatePayment({
        id: payment.id,
        data: {
          session_id: null,
          amount: null,
          currency_code: null,
          transactionStatus: null,
          card_brand: null,
          card_last4: null,
          opaque_data: null,
          responseCode: "1",
          transId: TRANS_ID,
          accountNumber: "XXXX1111",
          accountType: "Visa",
          authCode: "ABC123",
        },
      })

      await api.post(`/admin/payments/${payment.id}/capture`, {}, { headers: adminHeaders })
      anet.state.status = "settledSuccessfully"
      await api.post(`/admin/payments/${payment.id}/refund`, { amount: 5 }, { headers: adminHeaders })

      const sent = transactions(anet.calls)
      expect(sent[1]).toMatchObject({ transactionType: "priorAuthCaptureTransaction", refTransId: TRANS_ID })
      expect(sent[2]).toMatchObject({ transactionType: "refundTransaction", amount: "5.00", refTransId: TRANS_ID })
      expect(sent[2]).not.toHaveProperty("currencyCode")
    })

    it("12. records a capture made in the Merchant Interface once, however often the webhook comes", async () => {
      const { anet, session, payment } = await paidOrder("manual")
      anet.state.status = "capturedPendingSettlement"
      const event = webhookEvent("net.authorize.payment.priorAuthCapture.created", {
        id: TRANS_ID,
        authAmount: 19.99,
        responseCode: 1,
      })

      const first = await deliverWebhook(getContainer(), event)
      await deliverWebhook(getContainer(), event)

      expect(first).toMatchObject({ action: PaymentActions.SUCCESSFUL, data: { session_id: session.id } })
      // Medusa recorded the capture; the provider saw it captured and sent no capture of its own
      expect(transactions(anet.calls).map((t) => t.transactionType)).toEqual(["authOnlyTransaction"])
      const [captured] = await listPayments(payment.payment_collection_id)
      expect(captured.captures).toHaveLength(1)
    })
  },
})

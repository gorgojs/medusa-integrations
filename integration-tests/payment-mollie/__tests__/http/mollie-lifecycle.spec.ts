/**
 * The whole Mollie payment cycle through the store, admin and webhook APIs: a session created at
 * the payment step → the buyer pays on Mollie's page (the test moves the mocked payment) → cart
 * completion → capture and refunds from Admin → cancel, plus a failed payment, and a webhook that
 * completes the cart when the buyer never came back.
 *
 * The provider runs from the built package; nock plays Mollie and records what it was sent. A call
 * with no interceptor fails at the network, which fails the step that sent it.
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { refreshPaymentCollectionForCartWorkflow } from "@medusajs/medusa/core-flows"
import nock from "nock"
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
import { seedMollieIntegration } from "../utils/seed-mollie"
import { postWebhook } from "../utils/webhooks"

jest.setTimeout(180 * 1000)

beforeAll(() => mockMollieNetwork())
afterAll(() => restoreMollieNetwork())

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

    const createSession = async (collectionId: string) => {
      const res = await api.post(
        `/store/payment-collections/${collectionId}/payment-sessions`,
        { provider_id: MOLLIE_PAYMENT_PROVIDER_ID, data: { redirect_url: REDIRECT_URL } },
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

    const listOrders = async () => {
      const orderModule: any = getContainer().resolve(Modules.ORDER)
      return orderModule.listOrders({})
    }

    /** A cart with a Mollie payment session the buyer has not paid yet. */
    const openPayment = async (capture: "automatic" | "manual" = "automatic") => {
      await seedMollieIntegration(getContainer(), { capture })
      const mollie = mockMollie()
      const { cartId, collectionId } = await createMollieCart(getContainer())
      const session = await createSession(collectionId)
      return { mollie, cartId, collectionId, session, payment: mollie.latest() }
    }

    /** A cart the buyer paid on Mollie's page and completed on coming back. */
    const completedOrder = async (capture: "automatic" | "manual") => {
      const opened = await openPayment(capture)
      if (capture === "manual") {
        opened.mollie.authorize(opened.payment.id)
      } else {
        opened.mollie.pay(opened.payment.id)
      }
      const res = await completeCart(opened.cartId)
      expect(res.status).toBe(200)
      expect(res.data.type).toBe("order")
      const [medusaPayment] = await listPayments(opened.collectionId)
      return { ...opened, order: res.data.order, medusaPayment }
    }

    it("1. completes the cart of a paid payment into an order with the payment captured", async () => {
      const { mollie, payment, medusaPayment, session } = await completedOrder("automatic")

      expect(medusaPayment.captures).toHaveLength(1)
      expect(medusaPayment.captured_at).toBeTruthy()
      expect(medusaPayment.data).toMatchObject({
        id: payment.id,
        status: "paid",
        session_id: session.id,
        card_brand: "Mastercard",
        card_last4: "6787",
        checkout_url: null,
      })
      // the buyer paid on Mollie's page: Medusa only read the payment, it charged nothing itself
      expect(mollie.callsTo("POST", /.*/).map((c) => c.path)).toEqual(["/v2/payments"])
      expect(await listOrders()).toHaveLength(1)
    })

    it("2. authorizes a manual-capture payment, captures it from Admin, then refunds it in two parts", async () => {
      const { mollie, payment, medusaPayment } = await completedOrder("manual")
      expect(mollie.callsTo("POST", "/v2/payments")[0].body.captureMode).toBe("manual")
      expect(medusaPayment.captures).toHaveLength(0)
      expect(medusaPayment.data.status).toBe("authorized")

      const captured = await api.post(`/admin/payments/${medusaPayment.id}/capture`, {}, { headers: adminHeaders })

      expect(captured.status).toBe(200)
      const [capture] = mollie.callsTo("POST", `/v2/payments/${payment.id}/captures`)
      expect(mollie.callsTo("POST", `/v2/payments/${payment.id}/captures`)).toHaveLength(1)
      expect(capture.body ?? {}).not.toHaveProperty("amount")
      expect(capture.headers["idempotency-key"]).toBeTruthy()
      expect(payment.status).toBe("paid")

      const first = await api.post(`/admin/payments/${medusaPayment.id}/refund`, { amount: 5 }, { headers: adminHeaders })
      const second = await api.post(`/admin/payments/${medusaPayment.id}/refund`, { amount: 2.5 }, { headers: adminHeaders })

      expect(first.status).toBe(200)
      expect(second.status).toBe(200)
      const refunds = mollie.callsTo("POST", `/v2/payments/${payment.id}/refunds`)
      expect(refunds.map((r) => r.body.amount)).toEqual([
        { currency: "EUR", value: "5.00" },
        { currency: "EUR", value: "2.50" },
      ])
      expect(refunds[0].headers["idempotency-key"]).toBeTruthy()
      expect(refunds[0].headers["idempotency-key"]).not.toBe(refunds[1].headers["idempotency-key"])
      const [refunded] = await listPayments(medusaPayment.payment_collection_id)
      expect(refunded.captures).toHaveLength(1)
      expect(refunded.refunds).toHaveLength(2)
      expect(refunded.data.id).toBe(payment.id)
      expect(refunded.data.refunds.map((r: any) => r.id)).toEqual(["re_Mock1", "re_Mock2"])
    })

    it("3. releases the authorization when the order of an authorized payment is canceled", async () => {
      const { mollie, payment, order } = await completedOrder("manual")

      const res = await api.post(`/admin/orders/${order.id}/cancel`, {}, { headers: adminHeaders })

      expect(res.status).toBe(200)
      expect(mollie.callsTo("POST", `/v2/payments/${payment.id}/release-authorization`)).toHaveLength(1)
      expect(mollie.callsTo("POST", `/v2/payments/${payment.id}/captures`)).toHaveLength(0)
      expect(payment.status).toBe("canceled")
    })

    it("4. hands a failed payment back to the storefront with Mollie's reason and creates no order", async () => {
      const { mollie, payment, cartId, collectionId } = await openPayment()
      mollie.fail(payment.id, "insufficient_funds")

      const res = await completeCart(cartId)

      expect(res.status).toBe(200)
      expect(res.data.type).toBe("cart")
      expect(res.data.error.message).toContain("insufficient_funds")
      expect(await listPayments(collectionId)).toHaveLength(0)
      expect(await listOrders()).toHaveLength(0)
    })

    it("5. refuses to complete the cart while the buyer has not paid, and keeps the session", async () => {
      const { cartId, collectionId, session } = await openPayment()

      const res = await completeCart(cartId)

      // `open` is reported as requires_more, which Medusa answers with "not authorized", not an order
      expect(res.status).toBe(400)
      expect(JSON.stringify(res.data)).toContain("was not authorized with the provider")
      const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
      expect((await paymentModule.retrievePaymentSession(session.id)).status).toBe("requires_more")
      expect(await listPayments(collectionId)).toHaveLength(0)
      expect(await listOrders()).toHaveLength(0)
    })

    describe("webhook", () => {
      it("6. creates the order when `paid` arrives and the buyer never came back", async () => {
        const { mollie, payment, collectionId, session } = await openPayment()
        mollie.pay(payment.id)

        const status = await postWebhook(api, getContainer(), payment.id)

        expect(status).toBe(200)
        expect(await listOrders()).toHaveLength(1)
        const [medusaPayment] = await listPayments(collectionId)
        expect(medusaPayment.captures).toHaveLength(1)
        expect(medusaPayment.data).toMatchObject({ id: payment.id, status: "paid", session_id: session.id })
        // the webhook only names the payment: its status came from reading it back
        expect(mollie.callsTo("GET", `/v2/payments/${payment.id}`).length).toBeGreaterThanOrEqual(1)
      })

      it("7. changes nothing when the same webhook comes again", async () => {
        const { mollie, payment, collectionId } = await openPayment()
        mollie.pay(payment.id)
        await postWebhook(api, getContainer(), payment.id)
        const [before] = await listPayments(collectionId)

        const status = await postWebhook(api, getContainer(), payment.id)

        expect(status).toBe(200)
        expect(await listOrders()).toHaveLength(1)
        const payments = await listPayments(collectionId)
        expect(payments).toHaveLength(1)
        expect(payments[0].id).toBe(before.id)
        expect(payments[0].captures).toHaveLength(1)
        expect(mollie.callsTo("POST", /captures|refunds/)).toHaveLength(0)
      })

      it("8. answers 200 and changes nothing for an id Mollie does not know", async () => {
        const { mollie, cartId, collectionId, payment } = await openPayment()
        mollie.pay(payment.id)

        const status = await postWebhook(api, getContainer(), "tr_unknown")

        expect(status).toBe(200)
        expect(mollie.callsTo("GET", "/v2/payments/tr_unknown")).toHaveLength(1)
        expect(await listOrders()).toHaveLength(0)
        expect(await listPayments(collectionId)).toHaveLength(0)
        const cartModule: any = getContainer().resolve(Modules.CART)
        expect((await cartModule.retrieveCart(cartId)).completed_at).toBeFalsy()
      })

      it("10. refunds a payment the buyer paid after its session was replaced, and places no order", async () => {
        const { mollie, payment, cartId } = await openPayment()
        // the cart total changes, Medusa replaces the session, and Mollie refuses to cancel the old payment
        const cartModule: any = getContainer().resolve(Modules.CART)
        const [item] = await cartModule.listLineItems({ cart_id: cartId })
        await cartModule.updateLineItems(item.id, { quantity: 2 })
        await refreshPaymentCollectionForCartWorkflow(getContainer()).run({ input: { cart_id: cartId } })
        expect(payment.status).toBe("open")

        // the buyer goes forward to the old Mollie page and pays it
        mollie.pay(payment.id)
        const status = await postWebhook(api, getContainer(), payment.id)

        expect(status).toBe(200)
        const refunds = mollie.callsTo("POST", `/v2/payments/${payment.id}/refunds`)
        expect(refunds).toHaveLength(1)
        expect(refunds[0].body.amount).toEqual(payment.amount)
        expect(refunds[0].headers["idempotency-key"]).toBe(`${payment.id}-orphan-refund`)
        expect(await listOrders()).toHaveLength(0)
        expect((await cartModule.retrieveCart(cartId)).completed_at).toBeFalsy()
      })

      it("9. ignores a webhook while the payment is still open", async () => {
        const { mollie, payment, collectionId } = await openPayment()

        const status = await postWebhook(api, getContainer(), payment.id)

        expect(status).toBe(200)
        expect(mollie.callsTo("GET", `/v2/payments/${payment.id}`).length).toBeGreaterThanOrEqual(1)
        expect(await listOrders()).toHaveLength(0)
        expect(await listPayments(collectionId)).toHaveLength(0)
      })
    })
  },
})

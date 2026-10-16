/**
 * The whole PayPal payment cycle through the store and admin APIs: session → PayPal order → approval
 * → cart completion → capture → refunds → void, plus the webhook paths that finish a payment when the
 * storefront does not.
 *
 * The real generated client runs from the built package; nock plays PayPal and records what the
 * provider sent. An unexpected PayPal call has no interceptor and fails the test.
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, PaymentActions } from "@medusajs/framework/utils"
import { refreshPaymentCollectionForCartWorkflow } from "@medusajs/medusa/core-flows"
import nock from "nock"
import { seedPayPalIntegration } from "../utils/seed-paypal"
import {
  createAdminHeaders,
  createPayPalCart,
  createStoreHeaders,
  mockPayPalNetwork,
  PAYPAL_API,
  PAYPAL_PAYMENT_PROVIDER_ID,
  paypalOrder,
  restorePayPalNetwork,
} from "../utils/fixtures"
import { deliverWebhook, mockSignatureCheck, webhookEvent } from "../utils/webhooks"

jest.setTimeout(180 * 1000)

type Call = { body: any; requestId?: string }

beforeAll(() => mockPayPalNetwork())
afterAll(() => restorePayPalNetwork())

/** PayPal accepts the order and echoes what the provider sent; returns the recorded calls. */
function mockCreateOrder(intent = "CAPTURE") {
  const calls: Call[] = []
  nock(PAYPAL_API)
    .post("/v2/checkout/orders")
    .reply(201, function (this: any, _uri: string, body: any) {
      calls.push({ body, requestId: this.req.headers["paypal-request-id"] })
      const unit = body.purchase_units[0]
      return {
        id: "ORDER-1",
        intent,
        status: "CREATED",
        purchase_units: [{ reference_id: unit.reference_id, custom_id: unit.custom_id, amount: unit.amount }],
      }
    })
  return calls
}

function record(calls: Call[], status: number, response: unknown) {
  return function (this: any, _uri: string, body: any) {
    calls.push({ body, requestId: this.req.headers["paypal-request-id"] })
    return [status, response]
  }
}

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
      // drop what a test left unconsumed, keep the persisted OAuth answer
      nock.abortPendingRequests()
    })

    const createSession = async (collectionId: string, data: Record<string, unknown> = {}) => {
      const res = await api.post(
        `/store/payment-collections/${collectionId}/payment-sessions`,
        { provider_id: PAYPAL_PAYMENT_PROVIDER_ID, data },
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
      return paymentModule.listPayments(
        { payment_collection_id: collectionId },
        { relations: ["captures", "refunds"] }
      )
    }

    /** A session with an approved PayPal order, ready for completion. */
    const approvedSession = async (intent: "CAPTURE" | "AUTHORIZE" = "CAPTURE") => {
      const { cartId, collectionId } = await createPayPalCart(getContainer())
      const created = mockCreateOrder(intent)
      const session = await createSession(collectionId)
      nock(PAYPAL_API)
        .get("/v2/checkout/orders/ORDER-1")
        .reply(200, paypalOrder(collectionId, session.id, { intent, status: "APPROVED" }))
      return { cartId, collectionId, session, created }
    }

    it("1-2. creates the PayPal order for the session, then captures it when the cart completes", async () => {
      await seedPayPalIntegration(getContainer())
      const { cartId, collectionId, session, created } = await approvedSession()

      expect(session.data).toMatchObject({ paypal_order_id: "ORDER-1", intent: "CAPTURE", status: "CREATED" })
      expect(created[0].requestId).toBe(session.id)
      expect(created[0].body.purchase_units[0]).toMatchObject({
        reference_id: collectionId,
        custom_id: session.id,
        amount: { currency_code: "EUR", value: "10.00" },
      })

      const captures: Call[] = []
      nock(PAYPAL_API)
        .post("/v2/checkout/orders/ORDER-1/capture")
        .reply(
          record(captures, 201, paypalOrder(collectionId, session.id, { status: "COMPLETED" }, {
            payments: { captures: [{ id: "CAP-1", status: "COMPLETED", amount: { currency_code: "EUR", value: "10.00" } }] },
          }))
        )

      const res = await completeCart(cartId)

      expect(res.status).toBe(200)
      expect(res.data.type).toBe("order")
      expect(captures[0].requestId).toBe(`${session.id}-capture`)
      const [payment] = await listPayments(collectionId)
      expect(payment.captured_at).toBeTruthy()
      expect(payment.captures).toHaveLength(1)
      expect(payment.data).toMatchObject({ capture_id: "CAP-1" })
    })

    describe("intent AUTHORIZE", () => {
      const authorizeAndComplete = async () => {
        await seedPayPalIntegration(getContainer(), { intent: "authorize" })
        const approved = await approvedSession("AUTHORIZE")
        nock(PAYPAL_API)
          .post("/v2/checkout/orders/ORDER-1/authorize")
          .reply(201, paypalOrder(approved.collectionId, approved.session.id, { intent: "AUTHORIZE", status: "COMPLETED" }, {
            payments: { authorizations: [{ id: "AUTH-1", status: "CREATED" }] },
          }))
        const res = await completeCart(approved.cartId)
        expect(res.status).toBe(200)
        const [payment] = await listPayments(approved.collectionId)
        return { ...approved, order: res.data.order, payment }
      }

      it("3. authorizes on completion and captures the whole authorization from Admin", async () => {
        const { payment } = await authorizeAndComplete()
        expect(payment.captured_at).toBeFalsy()
        expect(payment.data).toMatchObject({ authorization_id: "AUTH-1" })

        const captures: Call[] = []
        nock(PAYPAL_API)
          .post("/v2/payments/authorizations/AUTH-1/capture")
          .reply(record(captures, 201, { id: "CAP-1", status: "COMPLETED" }))

        const res = await api.post(`/admin/payments/${payment.id}/capture`, {}, { headers: adminHeaders })

        expect(res.status).toBe(200)
        expect(captures[0].body).toEqual({ final_capture: true })
        expect(captures[0].requestId).toMatch(/^capt_/)
      })

      it("4. refunds part of the payment twice, each with its own amount and request id", async () => {
        const { payment } = await authorizeAndComplete()
        nock(PAYPAL_API)
          .post("/v2/payments/authorizations/AUTH-1/capture")
          .reply(201, { id: "CAP-1", status: "COMPLETED" })
        await api.post(`/admin/payments/${payment.id}/capture`, {}, { headers: adminHeaders })

        const refunds: Call[] = []
        nock(PAYPAL_API)
          .post("/v2/payments/captures/CAP-1/refund")
          .reply(record(refunds, 201, { id: "REF-1", status: "COMPLETED" }))
          .post("/v2/payments/captures/CAP-1/refund")
          .reply(record(refunds, 201, { id: "REF-2", status: "COMPLETED" }))

        await api.post(`/admin/payments/${payment.id}/refund`, { amount: 3 }, { headers: adminHeaders })
        await api.post(`/admin/payments/${payment.id}/refund`, { amount: 2.5 }, { headers: adminHeaders })

        expect(refunds.map((r) => r.body)).toEqual([
          { amount: { currency_code: "EUR", value: "3.00" } },
          { amount: { currency_code: "EUR", value: "2.50" } },
        ])
        expect(refunds[0].requestId).toMatch(/^ref_/)
        expect(refunds[1].requestId).toMatch(/^ref_/)
        expect(refunds[0].requestId).not.toBe(refunds[1].requestId)
      })

      it("5. voids the authorization when the order is canceled", async () => {
        const { order } = await authorizeAndComplete()
        const voids: Call[] = []
        nock(PAYPAL_API)
          .post("/v2/payments/authorizations/AUTH-1/void")
          .reply(record(voids, 200, { id: "AUTH-1", status: "VOIDED" }))

        const res = await api.post(`/admin/orders/${order.id}/cancel`, {}, { headers: adminHeaders })

        expect(res.status).toBe(200)
        expect(voids).toHaveLength(1)
      })
    })

    it("6. reuses the PayPal order with a PATCH when the address changes in the PayPal window", async () => {
      await seedPayPalIntegration(getContainer())
      const { cartId, collectionId } = await createPayPalCart(getContainer())
      const created = mockCreateOrder()
      const first = await createSession(collectionId)

      // the cart total changes: Medusa drops the sessions without calling PayPal
      const cartModule: any = getContainer().resolve(Modules.CART)
      const [item] = await cartModule.listLineItems({ cart_id: cartId })
      await cartModule.updateLineItems(item.id, { quantity: 2 })
      await refreshPaymentCollectionForCartWorkflow(getContainer()).run({ input: { cart_id: cartId } })

      const patches: Call[] = []
      nock(PAYPAL_API)
        .get("/v2/checkout/orders/ORDER-1")
        .reply(200, paypalOrder(collectionId, first.id, { status: "PAYER_ACTION_REQUIRED" }))
        .patch("/v2/checkout/orders/ORDER-1")
        .reply(record(patches, 204, ""))

      const second = await createSession(collectionId, { paypal_order_id: "ORDER-1", express: true })

      expect(created).toHaveLength(1)
      expect(second.id).not.toBe(first.id)
      expect(second.data).toMatchObject({ paypal_order_id: "ORDER-1", session_id: second.id })
      expect(patches[0].body).toEqual([
        {
          op: "replace",
          path: `/purchase_units/@reference_id=='${collectionId}'/amount`,
          value: { currency_code: "EUR", value: "20.00" },
        },
        { op: "replace", path: `/purchase_units/@reference_id=='${collectionId}'/custom_id`, value: second.id },
      ])
    })

    it("6b. refuses a higher total for an order the buyer already approved, without patching it", async () => {
      await seedPayPalIntegration(getContainer())
      const { cartId, collectionId } = await createPayPalCart(getContainer())
      mockCreateOrder()
      const first = await createSession(collectionId)

      const cartModule: any = getContainer().resolve(Modules.CART)
      const [item] = await cartModule.listLineItems({ cart_id: cartId })
      await cartModule.updateLineItems(item.id, { quantity: 2 })
      await refreshPaymentCollectionForCartWorkflow(getContainer()).run({ input: { cart_id: cartId } })

      nock(PAYPAL_API)
        .get("/v2/checkout/orders/ORDER-1")
        .reply(200, paypalOrder(collectionId, first.id, { status: "APPROVED" }))

      const res = await api.post(
        `/store/payment-collections/${collectionId}/payment-sessions`,
        { provider_id: PAYPAL_PAYMENT_PROVIDER_ID, data: { paypal_order_id: "ORDER-1", express: true } },
        { headers: storeHeaders, validateStatus: () => true }
      )

      expect(res.status).toBe(400)
      expect(res.data.message).toContain("approved for 10.00 EUR")
      // no PATCH interceptor exists: a PATCH would have failed the request with a network error instead
    })

    describe("webhooks", () => {
      it("7. a PAYMENT.CAPTURE.COMPLETED webhook completes a cart the storefront never completed", async () => {
        await seedPayPalIntegration(getContainer())
        const { cartId, collectionId } = await createPayPalCart(getContainer())
        mockCreateOrder()
        const session = await createSession(collectionId)
        const completed = paypalOrder(collectionId, session.id, { status: "COMPLETED" }, {
          payments: { captures: [{ id: "CAP-1", status: "COMPLETED", custom_id: session.id }] },
        })
        mockSignatureCheck("SUCCESS")
        nock(PAYPAL_API).get("/v2/checkout/orders/ORDER-1").reply(200, completed)

        const result = await deliverWebhook(
          getContainer(),
          webhookEvent("PAYMENT.CAPTURE.COMPLETED", {
            id: "CAP-1",
            status: "COMPLETED",
            custom_id: session.id,
            amount: { currency_code: "EUR", value: "10.00" },
          })
        )

        expect(result.action).toBe(PaymentActions.SUCCESSFUL)
        const cartModule: any = getContainer().resolve(Modules.CART)
        const cart = await cartModule.retrieveCart(cartId)
        expect(cart.completed_at).toBeTruthy()
        const [payment] = await listPayments(collectionId)
        expect(payment.captured_at).toBeTruthy()
      })

      it("7. a CHECKOUT.ORDER.APPROVED webhook completes nothing: no money has moved", async () => {
        await seedPayPalIntegration(getContainer())
        const { cartId, collectionId } = await createPayPalCart(getContainer())
        mockCreateOrder()
        const session = await createSession(collectionId)
        mockSignatureCheck("SUCCESS")

        const result = await deliverWebhook(
          getContainer(),
          webhookEvent("CHECKOUT.ORDER.APPROVED", { id: "ORDER-1", status: "APPROVED", purchase_units: [{ custom_id: session.id }] })
        )

        expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
        const cartModule: any = getContainer().resolve(Modules.CART)
        expect((await cartModule.retrieveCart(cartId)).completed_at).toBeFalsy()
      })

      it("8. a pending capture leaves the payment authorized until the webhook captures it, with no second PayPal call", async () => {
        await seedPayPalIntegration(getContainer())
        const { cartId, collectionId, session } = await approvedSession()
        nock(PAYPAL_API)
          .post("/v2/checkout/orders/ORDER-1/capture")
          .reply(201, paypalOrder(collectionId, session.id, { status: "COMPLETED" }, {
            payments: { captures: [{ id: "CAP-1", status: "PENDING" }] },
          }))

        expect((await completeCart(cartId)).status).toBe(200)
        let [payment] = await listPayments(collectionId)
        expect(payment.captured_at).toBeFalsy()
        expect(payment.data).toMatchObject({ capture_id: "CAP-1", capture_status: "PENDING" })

        mockSignatureCheck("SUCCESS")
        await deliverWebhook(
          getContainer(),
          webhookEvent("PAYMENT.CAPTURE.COMPLETED", {
            id: "CAP-1",
            status: "COMPLETED",
            custom_id: session.id,
            amount: { currency_code: "EUR", value: "10.00" },
          })
        )

        ;[payment] = await listPayments(collectionId)
        expect(payment.captured_at).toBeTruthy()
        expect(payment.captures).toHaveLength(1)
      })

      it("9. a PAYMENT.CAPTURE.COMPLETED webhook for a captured payment adds no second capture", async () => {
        await seedPayPalIntegration(getContainer())
        const { cartId, collectionId, session } = await approvedSession()
        nock(PAYPAL_API)
          .post("/v2/checkout/orders/ORDER-1/capture")
          .reply(201, paypalOrder(collectionId, session.id, { status: "COMPLETED" }, {
            payments: { captures: [{ id: "CAP-1", status: "COMPLETED" }] },
          }))
        expect((await completeCart(cartId)).status).toBe(200)

        mockSignatureCheck("SUCCESS")
        await deliverWebhook(
          getContainer(),
          webhookEvent("PAYMENT.CAPTURE.COMPLETED", {
            id: "CAP-1",
            status: "COMPLETED",
            custom_id: session.id,
            amount: { currency_code: "EUR", value: "10.00" },
          })
        )

        const [payment] = await listPayments(collectionId)
        expect(payment.captures).toHaveLength(1)
      })
    })
  },
})

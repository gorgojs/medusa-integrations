/**
 * The whole Stripe payment cycle through the store and admin APIs: session → PaymentIntent → the
 * storefront confirms it → cart completion → capture → refunds → cancel, plus the webhook paths that
 * finish a payment when the storefront does not, and payments created by Medusa's core provider.
 *
 * The real Stripe SDK runs from the built package; nock plays Stripe and records what the provider
 * sent. An unexpected Stripe call has no interceptor and fails the test.
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, PaymentActions } from "@medusajs/framework/utils"
import {
  createPaymentSessionsWorkflow,
  refreshPaymentCollectionForCartWorkflow,
} from "@medusajs/medusa/core-flows"
import nock from "nock"
import { seedStripeIntegration } from "../utils/seed-stripe"
import {
  createAdminHeaders,
  createStoreHeaders,
  createStripeCart,
  mockStripeNetwork,
  paymentIntent,
  restoreStripeNetwork,
  STRIPE_API,
  STRIPE_PAYMENT_PROVIDER_ID,
} from "../utils/fixtures"
import { deliverWebhook, webhookEvent } from "../utils/webhooks"

jest.setTimeout(180 * 1000)

/** What the provider sent: the form-encoded body as flat `key[sub]` entries, and the idempotency key. */
type Call = { body: Record<string, string>; idempotencyKey?: string; path: string }

beforeAll(() => mockStripeNetwork())
afterAll(() => restoreStripeNetwork())

function parse(body: unknown): Record<string, string> {
  return typeof body === "string" && body ? Object.fromEntries(new URLSearchParams(body)) : {}
}

function record(calls: Call[], status: number, response: unknown) {
  return function (this: any, uri: string, body: unknown) {
    calls.push({ body: parse(body), idempotencyKey: this.req.headers["idempotency-key"], path: uri })
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
      // drop what a test left unconsumed
      nock.abortPendingRequests()
      nock.cleanAll()
    })

    /** Stripe accepts the PaymentIntent and echoes the session it belongs to; returns the recorded calls. */
    const mockCreateIntent = (collectionId: string, overrides: Record<string, any> = {}) => {
      const calls: Call[] = []
      nock(STRIPE_API)
        .post("/v1/payment_intents")
        .reply(function (this: any, uri: string, body: unknown) {
          const parsed = parse(body)
          calls.push({ body: parsed, idempotencyKey: this.req.headers["idempotency-key"], path: uri })
          return [
            200,
            paymentIntent(collectionId, parsed["metadata[session_id]"], {
              capture_method: parsed.capture_method,
              ...overrides,
            }),
          ]
        })
      return calls
    }

    /** The PaymentIntent as the storefront left it after confirming. */
    const mockRetrieveIntent = (collectionId: string, sessionId: string, overrides: Record<string, any>) =>
      nock(STRIPE_API)
        .get("/v1/payment_intents/pi_1")
        .query(true)
        .reply(200, paymentIntent(collectionId, sessionId, overrides))

    const createSession = async (collectionId: string, data: Record<string, unknown> = {}) => {
      const res = await api.post(
        `/store/payment-collections/${collectionId}/payment-sessions`,
        { provider_id: STRIPE_PAYMENT_PROVIDER_ID, data },
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

    /** A session whose PaymentIntent the storefront has confirmed into `status`, ready for completion. */
    const confirmedSession = async (status: "succeeded" | "requires_capture", capture_method = "automatic_async") => {
      const { cartId, collectionId } = await createStripeCart(getContainer())
      const created = mockCreateIntent(collectionId)
      const session = await createSession(collectionId)
      mockRetrieveIntent(collectionId, session.id, {
        status,
        capture_method,
        amount_received: status === "succeeded" ? 1000 : 0,
        payment_method: { id: "pm_1", type: "card", card: { brand: "visa", last4: "4242", wallet: null } },
      })
      return { cartId, collectionId, session, created }
    }

    it("1. creates the PaymentIntent from Medusa's amount, the settings and the cart's address", async () => {
      await seedStripeIntegration(getContainer())
      const { collectionId } = await createStripeCart(getContainer())
      const created = mockCreateIntent(collectionId)

      const session = await createSession(collectionId)

      expect(created).toHaveLength(1)
      expect(created[0].idempotencyKey).toBe(session.id)
      expect(created[0].body).toMatchObject({
        amount: "1000",
        currency: "eur",
        capture_method: "automatic_async",
        "automatic_payment_methods[enabled]": "true",
        "metadata[session_id]": session.id,
        "metadata[payment_collection_id]": collectionId,
        "shipping[name]": "Anna Smith",
        "shipping[address][line1]": "Main St 1",
        "shipping[address][city]": "Berlin",
        "shipping[address][postal_code]": "10115",
        "shipping[address][country]": "DE",
      })
      expect(created[0].body["metadata[cart_id]"]).toMatch(/^cart_/)
      expect(Object.keys(created[0].body).some((key) => key.startsWith("payment_method_types"))).toBe(false)
      expect(created[0].body).not.toHaveProperty("receipt_email")
      expect(session.data).toMatchObject({
        id: "pi_1",
        client_secret: "pi_1_secret_nock",
        session_id: session.id,
        amount: 1000,
        currency: "eur",
      })
    })

    it("2. keeps what the storefront sends from overriding the merchant's settings", async () => {
      await seedStripeIntegration(getContainer(), { capture: "manual", sendReceiptEmail: true })
      const { collectionId } = await createStripeCart(getContainer())
      const created = mockCreateIntent(collectionId)

      await createSession(collectionId, {
        capture_method: "automatic",
        confirm: true,
        payment_method_types: ["card"],
        metadata: { injected: "yes" },
      })

      expect(created[0].body).toMatchObject({ capture_method: "manual", receipt_email: "buyer@example.com" })
      expect(created[0].body).not.toHaveProperty("confirm")
      expect(created[0].body).not.toHaveProperty("metadata[injected]")
      expect(Object.keys(created[0].body).some((key) => key.startsWith("payment_method_types"))).toBe(false)
    })

    it("2b. leaves the delivery address of an express payment to the wallet", async () => {
      await seedStripeIntegration(getContainer())
      const { collectionId } = await createStripeCart(getContainer())
      const created = mockCreateIntent(collectionId)

      await createSession(collectionId, { express: true })

      // the wallet sends its address with the publishable key when the storefront confirms, and
      // Stripe refuses that for shipping the backend set with the secret key
      expect(Object.keys(created[0].body).some((key) => key.startsWith("shipping"))).toBe(false)
      expect(created[0].body).toMatchObject({ amount: "1000", "metadata[cart_id]": expect.stringMatching(/^cart_/) })
    })

    it("3. completes the cart with a captured payment once the storefront confirmed the PaymentIntent", async () => {
      await seedStripeIntegration(getContainer())
      const { cartId, collectionId } = await confirmedSession("succeeded")

      const res = await completeCart(cartId)

      expect(res.status).toBe(200)
      expect(res.data.type).toBe("order")
      const [payment] = await listPayments(collectionId)
      expect(payment.captured_at).toBeTruthy()
      expect(payment.captures).toHaveLength(1)
      expect(payment.data).toMatchObject({ id: "pi_1", status: "succeeded", card_brand: "visa", card_last4: "4242" })
      expect(payment.data.client_secret).toBeFalsy()
    })

    it("3b. refuses to complete while the PaymentIntent waits for 3D Secure, keeping its client secret", async () => {
      await seedStripeIntegration(getContainer())
      const { cartId, collectionId } = await createStripeCart(getContainer())
      mockCreateIntent(collectionId)
      const session = await createSession(collectionId)
      mockRetrieveIntent(collectionId, session.id, { status: "requires_action" })

      const res = await completeCart(cartId)

      // Medusa refuses a session that is not authorized; the storefront finishes 3D Secure and retries
      expect(res.status).toBe(400)
      expect(res.data.type).toBe("not_allowed")
      const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
      const stored = await paymentModule.retrievePaymentSession(session.id)
      expect(stored.data.client_secret).toBe("pi_1_secret_nock")
    })

    describe("manual capture", () => {
      const authorizeAndComplete = async () => {
        await seedStripeIntegration(getContainer(), { capture: "manual" })
        const confirmed = await confirmedSession("requires_capture", "manual")
        const res = await completeCart(confirmed.cartId)
        expect(res.status).toBe(200)
        const [payment] = await listPayments(confirmed.collectionId)
        return { ...confirmed, order: res.data.order, payment }
      }

      const mockCapture = (calls: Call[], collectionId: string, sessionId: string) =>
        nock(STRIPE_API)
          .post("/v1/payment_intents/pi_1/capture")
          .reply(record(calls, 200, paymentIntent(collectionId, sessionId, { status: "succeeded", amount_received: 1000 })))

      it("4. authorizes on completion and captures the whole PaymentIntent from Admin", async () => {
        const { payment, collectionId, session } = await authorizeAndComplete()
        expect(payment.captured_at).toBeFalsy()
        expect(payment.data).toMatchObject({ status: "requires_capture", capture_method: "manual" })

        const captures: Call[] = []
        mockCapture(captures, collectionId, session.id)

        const res = await api.post(`/admin/payments/${payment.id}/capture`, {}, { headers: adminHeaders })

        expect(res.status).toBe(200)
        expect(captures).toHaveLength(1)
        expect(captures[0].body).not.toHaveProperty("amount_to_capture")
        expect(captures[0].idempotencyKey).toMatch(/^capt_/)
      })

      it("5. refunds part of the payment twice, each with its own amount and idempotency key", async () => {
        const { payment, collectionId, session } = await authorizeAndComplete()
        mockCapture([], collectionId, session.id)
        await api.post(`/admin/payments/${payment.id}/capture`, {}, { headers: adminHeaders })

        const refunds: Call[] = []
        nock(STRIPE_API)
          .post("/v1/refunds")
          .reply(record(refunds, 200, { id: "re_1", object: "refund", status: "succeeded", amount: 300 }))
          .post("/v1/refunds")
          .reply(record(refunds, 200, { id: "re_2", object: "refund", status: "pending", amount: 250 }))

        await api.post(`/admin/payments/${payment.id}/refund`, { amount: 3 }, { headers: adminHeaders })
        await api.post(`/admin/payments/${payment.id}/refund`, { amount: 2.5 }, { headers: adminHeaders })

        expect(refunds.map((r) => ({ amount: r.body.amount, payment_intent: r.body.payment_intent }))).toEqual([
          { amount: "300", payment_intent: "pi_1" },
          { amount: "250", payment_intent: "pi_1" },
        ])
        expect(refunds[0].idempotencyKey).toMatch(/^ref_/)
        expect(refunds[1].idempotencyKey).toMatch(/^ref_/)
        expect(refunds[0].idempotencyKey).not.toBe(refunds[1].idempotencyKey)
        const [refunded] = await listPayments(collectionId)
        expect(refunded.refunds).toHaveLength(2)
        expect(refunded.data.refunds.map((r: any) => r.id)).toEqual(["re_1", "re_2"])
      })

      it("6. cancels the PaymentIntent when the order is canceled", async () => {
        const { order, collectionId, session } = await authorizeAndComplete()
        const cancels: Call[] = []
        nock(STRIPE_API)
          .post("/v1/payment_intents/pi_1/cancel")
          .reply(record(cancels, 200, paymentIntent(collectionId, session.id, { status: "canceled" })))

        const res = await api.post(`/admin/orders/${order.id}/cancel`, {}, { headers: adminHeaders })

        expect(res.status).toBe(200)
        expect(cancels).toHaveLength(1)
      })
    })

    it("7. cancels the unconfirmed PaymentIntent when a cart change drops the session", async () => {
      await seedStripeIntegration(getContainer())
      const { cartId, collectionId } = await createStripeCart(getContainer())
      mockCreateIntent(collectionId)
      const session = await createSession(collectionId)

      const cancels: Call[] = []
      nock(STRIPE_API)
        .post("/v1/payment_intents/pi_1/cancel")
        .reply(record(cancels, 200, paymentIntent(collectionId, session.id, { status: "canceled" })))

      const cartModule: any = getContainer().resolve(Modules.CART)
      const [item] = await cartModule.listLineItems({ cart_id: cartId })
      await cartModule.updateLineItems(item.id, { quantity: 2 })
      await refreshPaymentCollectionForCartWorkflow(getContainer()).run({ input: { cart_id: cartId } })

      expect(cancels).toHaveLength(1)
      const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
      const collection = await paymentModule.retrievePaymentCollection(collectionId, { relations: ["payment_sessions"] })
      expect(collection.payment_sessions).toHaveLength(0)
    })

    describe("webhooks", () => {
      it("8. payment_intent.succeeded completes a cart the storefront never completed", async () => {
        await seedStripeIntegration(getContainer())
        const { cartId, collectionId } = await createStripeCart(getContainer())
        mockCreateIntent(collectionId)
        const session = await createSession(collectionId)
        mockRetrieveIntent(collectionId, session.id, { status: "succeeded", amount_received: 1000 })

        const result = await deliverWebhook(
          getContainer(),
          webhookEvent("payment_intent.succeeded", paymentIntent(collectionId, session.id, { status: "succeeded", amount_received: 1000 }))
        )

        expect(result).toMatchObject({ action: PaymentActions.SUCCESSFUL, data: { session_id: session.id, amount: 10 } })
        const cartModule: any = getContainer().resolve(Modules.CART)
        expect((await cartModule.retrieveCart(cartId)).completed_at).toBeTruthy()
        const [payment] = await listPayments(collectionId)
        expect(payment.captured_at).toBeTruthy()
      })

      it("8b. payment_intent.amount_capturable_updated completes the cart with an authorized payment", async () => {
        await seedStripeIntegration(getContainer(), { capture: "manual" })
        const { cartId, collectionId } = await createStripeCart(getContainer())
        mockCreateIntent(collectionId)
        const session = await createSession(collectionId)
        mockRetrieveIntent(collectionId, session.id, { status: "requires_capture", capture_method: "manual" })

        const result = await deliverWebhook(
          getContainer(),
          webhookEvent(
            "payment_intent.amount_capturable_updated",
            paymentIntent(collectionId, session.id, { status: "requires_capture", amount_capturable: 1000 })
          )
        )

        expect(result.action).toBe(PaymentActions.AUTHORIZED)
        const cartModule: any = getContainer().resolve(Modules.CART)
        expect((await cartModule.retrieveCart(cartId)).completed_at).toBeTruthy()
        const [payment] = await listPayments(collectionId)
        expect(payment.captured_at).toBeFalsy()
      })

      it("9. payment_intent.succeeded for a captured payment adds no second capture and calls Stripe no more", async () => {
        await seedStripeIntegration(getContainer())
        const { cartId, collectionId, session } = await confirmedSession("succeeded")
        expect((await completeCart(cartId)).status).toBe(200)

        // no interceptor is left: a call to Stripe would fail the delivery
        await deliverWebhook(
          getContainer(),
          webhookEvent("payment_intent.succeeded", paymentIntent(collectionId, session.id, { status: "succeeded", amount_received: 1000 }))
        )

        const [payment] = await listPayments(collectionId)
        expect(payment.captures).toHaveLength(1)
      })
    })

    it("10. captures and refunds a payment Medusa's core Stripe provider created", async () => {
      await seedStripeIntegration(getContainer(), { capture: "manual" })
      const { cartId, collectionId, session } = await confirmedSession("requires_capture", "manual")
      expect((await completeCart(cartId)).status).toBe(200)
      const paymentModule: any = getContainer().resolve(Modules.PAYMENT)
      const [created] = await listPayments(collectionId)

      // the core provider stored the whole PaymentIntent, client secret and payment method included
      const coreData = {
        ...paymentIntent(collectionId, session.id, {
          id: "pi_core",
          status: "requires_capture",
          capture_method: "manual",
          client_secret: "pi_core_secret",
          payment_method: { id: "pm_1", type: "card", billing_details: { email: "buyer@example.com" } },
        }),
        session_id: session.id,
      }
      await paymentModule.updatePayment({ id: created.id, data: coreData })

      const captures: Call[] = []
      nock(STRIPE_API)
        .post("/v1/payment_intents/pi_core/capture")
        .reply(record(captures, 200, paymentIntent(collectionId, session.id, { id: "pi_core", status: "succeeded", amount_received: 1000 })))
      const refunds: Call[] = []
      nock(STRIPE_API)
        .post("/v1/refunds")
        .reply(record(refunds, 200, { id: "re_1", object: "refund", status: "succeeded", amount: 400 }))

      expect((await api.post(`/admin/payments/${created.id}/capture`, {}, { headers: adminHeaders })).status).toBe(200)
      expect((await api.post(`/admin/payments/${created.id}/refund`, { amount: 4 }, { headers: adminHeaders })).status).toBe(200)

      expect(captures).toHaveLength(1)
      expect(refunds[0].body).toMatchObject({ payment_intent: "pi_core", amount: "400" })
      const [payment] = await listPayments(collectionId)
      expect(payment.data).toMatchObject({ id: "pi_core", status: "succeeded" })
      // Medusa merges data into the stored payment, so the provider clears these with null
      expect(payment.data.client_secret).toBeNull()
      expect(payment.data.payment_method).toBeNull()
    })

    it("11. creates a Stripe customer for a logged-in customer and attaches it to the PaymentIntent", async () => {
      await seedStripeIntegration(getContainer())
      const { collectionId } = await createStripeCart(getContainer())
      const customerModule: any = getContainer().resolve(Modules.CUSTOMER)
      const customer = await customerModule.createCustomers({ email: "member@example.com", first_name: "Mia", last_name: "Lee" })

      const customers: Call[] = []
      nock(STRIPE_API)
        .post("/v1/customers")
        .reply(record(customers, 200, { id: "cus_1", object: "customer", email: "member@example.com" }))
      const created = mockCreateIntent(collectionId)

      await createPaymentSessionsWorkflow(getContainer()).run({
        input: {
          payment_collection_id: collectionId,
          provider_id: STRIPE_PAYMENT_PROVIDER_ID,
          customer_id: customer.id,
          data: { setup_future_usage: "off_session" },
        },
      })

      expect(customers[0].body).toMatchObject({
        email: "member@example.com",
        name: "Mia Lee",
        "metadata[medusa_customer_id]": customer.id,
      })
      expect(created[0].body).toMatchObject({ customer: "cus_1", setup_future_usage: "off_session" })
    })
  },
})

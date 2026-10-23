import { Modules } from "@medusajs/framework/utils"
import { createPaymentCollectionForCartWorkflow, createRegionsWorkflow } from "@medusajs/medusa/core-flows"
import jwt from "jsonwebtoken"
import nock from "nock"

export const STRIPE_PAYMENT_PROVIDER_ID = "pp_stripe_stripe"
export const STRIPE_WEBHOOK_ROUTE = "/hooks/payment/stripe_stripe"
export const STRIPE_API = "https://api.stripe.com"

/** An admin bearer token, the way the ApiShip suite signs one. */
export async function createAdminHeaders(container: any): Promise<Record<string, string>> {
  const auth = container.resolve(Modules.AUTH)
  const users = container.resolve(Modules.USER)
  const user = await users.createUsers({ email: "admin@test.com" })
  const authIdentity = await auth.createAuthIdentities({
    provider_identities: [
      { provider: "emailpass", entity_id: "admin@test.com", provider_metadata: { password: "supersecret" } },
    ],
    app_metadata: { user_id: user.id },
  })
  const token = jwt.sign(
    { actor_id: user.id, actor_type: "user", auth_identity_id: authIdentity.id },
    "supersecret",
    { expiresIn: "1d" }
  )
  return { authorization: `Bearer ${token}` }
}

export async function createStoreHeaders(api: any, adminHeaders: Record<string, string>) {
  const { data } = await api.post(
    "/admin/api-keys",
    { title: "test-store-key", type: "publishable" },
    { headers: adminHeaders }
  )
  return { "x-publishable-api-key": data.api_key.token }
}

/**
 * A cart that can be completed with Stripe: a region with the Stripe provider, one custom item that
 * needs no shipping, a delivery address, and a payment collection.
 */
export async function createStripeCart(container: any, { currency = "eur", unitPrice = 10 } = {}) {
  const { result: regions } = await createRegionsWorkflow(container).run({
    input: {
      regions: [{ name: "Europe", currency_code: currency, countries: ["de"], payment_providers: [STRIPE_PAYMENT_PROVIDER_ID] }],
    },
  })
  const cartModule = container.resolve(Modules.CART)
  const cart = await cartModule.createCarts({
    currency_code: currency,
    region_id: regions[0].id,
    email: "buyer@example.com",
    shipping_address: {
      first_name: "Anna",
      last_name: "Smith",
      address_1: "Main St 1",
      city: "Berlin",
      postal_code: "10115",
      country_code: "de",
    },
    items: [{ title: "Tee", quantity: 1, unit_price: unitPrice, requires_shipping: false }],
  })
  const { result: collection } = await createPaymentCollectionForCartWorkflow(container).run({
    input: { cart_id: cart.id },
  })
  return { cartId: cart.id as string, regionId: regions[0].id as string, collectionId: collection.id as string }
}

/** Close the network to everything but the local test server: a request to Stripe needs its own nock. */
export function mockStripeNetwork() {
  nock.disableNetConnect()
  nock.enableNetConnect(/(localhost|127\.0\.0\.1)/)
}

export function restoreStripeNetwork() {
  nock.cleanAll()
  nock.enableNetConnect()
  nock.restore()
}

/** A PaymentIntent as the Stripe API returns it. */
export function paymentIntent(collectionId: string, sessionId: string, overrides: Record<string, any> = {}) {
  return {
    id: "pi_1",
    object: "payment_intent",
    status: "requires_payment_method",
    amount: 1000,
    amount_received: 0,
    currency: "eur",
    capture_method: "automatic_async",
    client_secret: "pi_1_secret_nock",
    payment_method: null,
    latest_charge: null,
    metadata: { session_id: sessionId, payment_collection_id: collectionId },
    ...overrides,
  }
}

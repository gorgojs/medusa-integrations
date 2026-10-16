import { Modules } from "@medusajs/framework/utils"
import { createPaymentCollectionForCartWorkflow, createRegionsWorkflow } from "@medusajs/medusa/core-flows"
import jwt from "jsonwebtoken"
import nock from "nock"

export const PAYPAL_PAYMENT_PROVIDER_ID = "pp_paypal_paypal"
export const PAYPAL_WEBHOOK_ROUTE = "/hooks/payment/paypal_paypal"
export const PAYPAL_API = "https://api-m.sandbox.paypal.com"

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
 * A cart that can be completed with PayPal: a region with the PayPal provider, one custom item that
 * needs no shipping, and a payment collection.
 */
export async function createPayPalCart(container: any, { currency = "eur", unitPrice = 10 } = {}) {
  const { result: regions } = await createRegionsWorkflow(container).run({
    input: {
      regions: [{ name: "Europe", currency_code: currency, countries: ["de"], payment_providers: [PAYPAL_PAYMENT_PROVIDER_ID] }],
    },
  })
  const cartModule = container.resolve(Modules.CART)
  const cart = await cartModule.createCarts({
    currency_code: currency,
    region_id: regions[0].id,
    email: "buyer@example.com",
    items: [{ title: "Tee", quantity: 1, unit_price: unitPrice, requires_shipping: false }],
  })
  const { result: collection } = await createPaymentCollectionForCartWorkflow(container).run({
    input: { cart_id: cart.id },
  })
  return { cartId: cart.id as string, regionId: regions[0].id as string, collectionId: collection.id as string }
}

/** Close the network to everything but the local test server, and answer the PayPal OAuth call. */
export function mockPayPalNetwork() {
  nock.disableNetConnect()
  nock.enableNetConnect(/(localhost|127\.0\.0\.1)/)
  nock(PAYPAL_API)
    .persist()
    .post("/v1/oauth2/token")
    .reply(200, { access_token: "nock-access-token", token_type: "Bearer", expires_in: 32400 })
}

export function restorePayPalNetwork() {
  nock.cleanAll()
  nock.enableNetConnect()
  nock.restore()
}

/** A PayPal order as the Orders API returns it. */
export function paypalOrder(
  collectionId: string,
  sessionId: string,
  overrides: Record<string, any> = {},
  unit: Record<string, any> = {}
) {
  return {
    id: "ORDER-1",
    intent: "CAPTURE",
    status: "CREATED",
    purchase_units: [
      {
        reference_id: collectionId,
        custom_id: sessionId,
        amount: { currency_code: "EUR", value: "10.00" },
        ...unit,
      },
    ],
    ...overrides,
  }
}

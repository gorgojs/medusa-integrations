import { Modules } from "@medusajs/framework/utils"
import { createPaymentCollectionForCartWorkflow, createRegionsWorkflow } from "@medusajs/medusa/core-flows"
import jwt from "jsonwebtoken"
import nock from "nock"

export const AUTHORIZENET_PAYMENT_PROVIDER_ID = "pp_authorizenet_authorizenet"
export const AUTHORIZENET_WEBHOOK_ROUTE = "/hooks/payment/authorizenet_authorizenet"
export const ANET_API = "https://apitest.authorize.net"

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
 * A cart that can be completed with Authorize.net: a US region with the provider, a billing address
 * and a different shipping address (both with a state and a ZIP), one custom item that needs no
 * shipping, and a payment collection.
 */
export async function createAuthorizeNetCart(container: any, { currency = "usd", unitPrice = 19.99 } = {}) {
  const { result: regions } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "United States",
          currency_code: currency,
          countries: ["us"],
          payment_providers: [AUTHORIZENET_PAYMENT_PROVIDER_ID],
        },
      ],
    },
  })
  const cartModule = container.resolve(Modules.CART)
  const cart = await cartModule.createCarts({
    currency_code: currency,
    region_id: regions[0].id,
    email: "buyer@example.com",
    billing_address: {
      first_name: "Anna",
      last_name: "Smith",
      address_1: "1 Market St",
      city: "San Francisco",
      province: "CA",
      postal_code: "94105",
      country_code: "us",
      phone: "+14155550100",
    },
    shipping_address: {
      first_name: "Anna",
      last_name: "Smith",
      address_1: "350 5th Ave",
      city: "New York",
      province: "NY",
      postal_code: "10118",
      country_code: "us",
      phone: "+12125550100",
    },
    items: [{ title: "Tee", quantity: 1, unit_price: unitPrice, requires_shipping: false }],
  })
  const { result: collection } = await createPaymentCollectionForCartWorkflow(container).run({
    input: { cart_id: cart.id },
  })
  return { cartId: cart.id as string, regionId: regions[0].id as string, collectionId: collection.id as string }
}

/** Close the network to everything but the local test server: a request to Authorize.net needs its own nock. */
export function mockAnetNetwork() {
  nock.disableNetConnect()
  nock.enableNetConnect(/(localhost|127\.0\.0\.1)/)
}

export function restoreAnetNetwork() {
  nock.cleanAll()
  nock.enableNetConnect()
  nock.restore()
}

type Responder = (body: any) => unknown

/**
 * Answer every Authorize.net JSON API call. They are all `POST /xml/v1/request.api` and differ only
 * by the root key of the body, so one persisted interceptor routes them by that key. Each call is
 * recorded in `calls`. A root with no responder gets a 500 naming it, so a test sees the call it did
 * not expect. The JSON starts with a UTF-8 byte order mark, as the real API's does.
 */
export function mockAnet(responders: Partial<Record<string, Responder>>) {
  const calls: { root: string; body: any }[] = []
  nock(ANET_API)
    .persist()
    .post("/xml/v1/request.api")
    .reply((_uri, requestBody) => {
      const body = (typeof requestBody === "string" ? JSON.parse(requestBody.replace(/^\uFEFF/, "")) : requestBody) as any
      const root = Object.keys(body)[0]
      calls.push({ root, body: body[root] })
      const responder = responders[root]
      if (!responder) {
        return [500, JSON.stringify({ unmocked: root })]
      }
      return [200, `\uFEFF${JSON.stringify(responder(body[root]))}`, { "content-type": "application/json" }]
    })
  return { calls }
}

const OK = { resultCode: "Ok", message: [{ code: "I00001", text: "Successful." }] }

/** A `createTransactionRequest` response for a transaction the gateway accepted. */
export function approvedTransaction({
  responseCode = "1",
  transId = "60001",
  ...overrides
}: { responseCode?: string; transId?: string; [key: string]: unknown } = {}) {
  return {
    messages: OK,
    transactionResponse: {
      responseCode,
      authCode: "ABC123",
      avsResultCode: "Y",
      cvvResultCode: "P",
      cavvResultCode: "2",
      transId,
      refTransID: "",
      transHash: "",
      testRequest: "0",
      accountNumber: "XXXX1111",
      accountType: "Visa",
      messages: [{ code: "1", description: "This transaction has been approved." }],
      ...overrides,
    },
  }
}

/** A `createTransactionRequest` response for a transaction the bank declined (2) or the gateway refused (3). */
export function declinedTransaction(errorCode: string, errorText: string, responseCode = "2") {
  return {
    messages: { resultCode: "Error", message: [{ code: "E00027", text: "The transaction was unsuccessful." }] },
    transactionResponse: {
      responseCode,
      authCode: "",
      transId: "0",
      accountNumber: "XXXX1111",
      accountType: "Visa",
      errors: [{ errorCode, errorText }],
    },
  }
}

/** A `getTransactionDetailsRequest` response. `transrefId` is the `refId` of the transaction's request. */
export function transactionDetails(
  status: string,
  overrides: { transrefId?: string; transId?: string; authAmount?: number; settleAmount?: number; [key: string]: unknown } = {}
) {
  const { transrefId, transId = "60001", authAmount = 19.99, settleAmount = 19.99, ...rest } = overrides
  return {
    ...(transrefId ? { transrefId } : {}),
    messages: OK,
    transaction: {
      transId,
      transactionStatus: status,
      authAmount,
      settleAmount,
      payment: { creditCard: { cardNumber: "XXXX1111", expirationDate: "XXXX", cardType: "Visa" } },
      ...rest,
    },
  }
}

/** A `getMerchantDetailsRequest` response. */
export function merchantDetails(overrides: Record<string, unknown> = {}) {
  return {
    messages: OK,
    isTestMode: false,
    gatewayId: "123456",
    currencies: ["USD"],
    ...overrides,
  }
}

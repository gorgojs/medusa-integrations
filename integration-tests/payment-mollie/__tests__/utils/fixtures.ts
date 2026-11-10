import { Modules } from "@medusajs/framework/utils"
import { createPaymentCollectionForCartWorkflow, createRegionsWorkflow } from "@medusajs/medusa/core-flows"
import jwt from "jsonwebtoken"
import nock from "nock"

export const MOLLIE_PAYMENT_PROVIDER_ID = "pp_mollie_mollie"
export const MOLLIE_API = "https://api.mollie.com"
export const REDIRECT_URL = "https://shop.example.com/api/payment-return?provider=mollie&cart_id=cart_1"
export const PROFILE_ID = "pfl_QkEhN94Ba"

/** An admin bearer token, the way the other payment suites sign one. */
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
 * A cart that can be completed with Mollie: a Dutch EUR region with the provider, a billing address
 * and a different shipping address, one custom item that needs no shipping, and a payment
 * collection. The test mode of Mollie only works in EUR.
 */
export async function createMollieCart(container: any, { unitPrice = 20 } = {}) {
  const { result: regions } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Netherlands",
          currency_code: "eur",
          countries: ["nl"],
          payment_providers: [MOLLIE_PAYMENT_PROVIDER_ID],
        },
      ],
    },
  })
  const cartModule = container.resolve(Modules.CART)
  const cart = await cartModule.createCarts({
    currency_code: "eur",
    region_id: regions[0].id,
    email: "buyer@example.com",
    billing_address: {
      first_name: "Jan",
      last_name: "Jansen",
      address_1: "Keizersgracht 126",
      city: "Amsterdam",
      postal_code: "1015 CW",
      country_code: "nl",
    },
    shipping_address: {
      first_name: "Piet",
      last_name: "Jansen",
      address_1: "Prinsengracht 2",
      city: "Amsterdam",
      postal_code: "1015 DV",
      country_code: "nl",
    },
    items: [{ title: "Tee", quantity: 1, unit_price: unitPrice, requires_shipping: false }],
  })
  const { result: collection } = await createPaymentCollectionForCartWorkflow(container).run({
    input: { cart_id: cart.id },
  })
  return { cartId: cart.id as string, regionId: regions[0].id as string, collectionId: collection.id as string }
}

/** Close the network to everything but the local test server: a request to Mollie needs its own nock. */
export function mockMollieNetwork() {
  nock.disableNetConnect()
  nock.enableNetConnect(/(localhost|127\.0\.0\.1)/)
}

export function restoreMollieNetwork() {
  nock.cleanAll()
  nock.enableNetConnect()
  nock.restore()
}

export type MollieStatus = "open" | "pending" | "authorized" | "paid" | "canceled" | "expired" | "failed"

type Amount = { currency: string; value: string }

/** What Mollie holds about one payment. */
export type MolliePayment = {
  id: string
  status: MollieStatus
  amount: Amount
  description: string
  metadata: Record<string, unknown> | null
  captureMode: "automatic" | "manual"
  redirectUrl: string | null
  webhookUrl: string | null
  failureReason?: string
  captures: { id: string; status: string }[]
  refunds: { id: string; status: string; amount: Amount }[]
}

export type MollieCall = {
  method: string
  path: string
  query: Record<string, string>
  headers: Record<string, string>
  body: any
}

const link = (href: string, type = "application/hal+json") => ({ href, type })
const DOCS = link("https://docs.mollie.com/reference/overview", "text/html")

/** A Mollie payment as the API returns it: the fields the SDK requires, `_links` in API naming. */
export function paymentJson(p: MolliePayment) {
  const open = p.status === "open"
  const paid = p.status === "paid"
  const refunded = p.refunds.reduce((sum, r) => sum + Number(r.amount.value), 0)
  return {
    resource: "payment",
    id: p.id,
    mode: "test",
    description: p.description,
    amount: p.amount,
    amountRefunded: { currency: p.amount.currency, value: refunded.toFixed(2) },
    amountRemaining: { currency: p.amount.currency, value: (Number(p.amount.value) - refunded).toFixed(2) },
    redirectUrl: p.redirectUrl,
    webhookUrl: p.webhookUrl,
    method: open || p.status === "canceled" || p.status === "expired" ? null : "creditcard",
    metadata: p.metadata,
    captureMode: p.captureMode,
    sequenceType: "oneoff",
    profileId: PROFILE_ID,
    status: p.status,
    // the sandbox refused to cancel an open payment the buyer had picked no method for (422)
    isCancelable: p.status === "authorized",
    details:
      p.status === "failed"
        ? { failureReason: p.failureReason ?? "card_declined" }
        : paid || p.status === "authorized"
          ? { cardNumber: "6787", cardLabel: "Mastercard" }
          : null,
    createdAt: "2026-11-02T10:00:00+00:00",
    expiresAt: open ? "2026-11-02T10:30:00+00:00" : null,
    _links: {
      self: link(`${MOLLIE_API}/v2/payments/${p.id}`),
      ...(open ? { checkout: link(`https://www.mollie.com/checkout/select-method/${p.id.slice(3)}`, "text/html") } : {}),
      dashboard: link(`https://my.mollie.com/dashboard/org_1/payments/${p.id}`, "text/html"),
      documentation: DOCS,
    },
  }
}

function listJson(selfPath: string, key: string, items: unknown[]) {
  return {
    count: items.length,
    _embedded: { [key]: items },
    _links: { self: link(`${MOLLIE_API}${selfPath}`), previous: null, next: null, documentation: DOCS },
  }
}

function errorJson(status: number, title: string, detail: string) {
  return { status, title, detail, _links: { documentation: link("https://docs.mollie.com/errors", "text/html") } }
}

const HAL = { "content-type": "application/hal+json" }

/**
 * Mollie as a small state machine over the payments it was asked to create. Every call is recorded
 * in `calls`; a call with no matching interceptor fails at the network, which fails the step that
 * sent it. Tests move a payment along as the buyer would on Mollie's page with `pay`, `authorize`
 * and `fail`.
 */
export function mockMollie() {
  const payments = new Map<string, MolliePayment>()
  const calls: MollieCall[] = []
  let sequence = 0

  const record = (method: string, uri: string, headers: Record<string, string>, requestBody: unknown): MollieCall => {
    const url = new URL(uri, MOLLIE_API)
    const body = typeof requestBody === "string" && requestBody ? JSON.parse(requestBody) : requestBody
    const call: MollieCall = {
      method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers,
      body: body || undefined,
    }
    calls.push(call)
    return call
  }
  const idOf = (path: string) => path.split("/")[3]
  const notFound = (id: string) => [404, errorJson(404, "Not Found", `No payment exists with token ${id}.`), HAL] as const

  const scope = nock(MOLLIE_API).persist()

  scope.post("/v2/payments").reply(function (uri, requestBody) {
    const call = record("POST", uri, this.req.headers as any, requestBody)
    const id = `tr_MockPay${(sequence += 1)}`
    const payment: MolliePayment = {
      id,
      status: "open",
      amount: call.body.amount,
      description: call.body.description,
      metadata: call.body.metadata ?? null,
      captureMode: call.body.captureMode ?? "automatic",
      redirectUrl: call.body.redirectUrl ?? null,
      webhookUrl: call.body.webhookUrl ?? null,
      captures: [],
      refunds: [],
    }
    payments.set(id, payment)
    return [201, paymentJson(payment), HAL]
  })

  scope.get(/^\/v2\/payments\/[^/?]+$/).query(true).reply(function (uri, requestBody) {
    const call = record("GET", uri, this.req.headers as any, requestBody)
    const payment = payments.get(idOf(call.path))
    return payment ? [200, paymentJson(payment), HAL] : notFound(idOf(call.path))
  })

  scope.delete(/^\/v2\/payments\/[^/?]+$/).reply(function (uri, requestBody) {
    const call = record("DELETE", uri, this.req.headers as any, requestBody)
    const payment = payments.get(idOf(call.path))
    if (!payment) {
      return notFound(idOf(call.path))
    }
    // Mollie's test mode answered this for an open payment with no method picked yet, which is every
    // open payment the provider creates: the buyer picks the method on Mollie's page
    return [422, errorJson(422, "Unprocessable Entity", "The payment cannot be cancelled"), HAL]
  })

  scope.post(/^\/v2\/payments\/[^/?]+\/release-authorization$/).reply(function (uri, requestBody) {
    const call = record("POST", uri, this.req.headers as any, requestBody)
    const payment = payments.get(idOf(call.path))
    if (!payment) {
      return notFound(idOf(call.path))
    }
    payment.status = "canceled"
    return [202, ""]
  })

  scope.post(/^\/v2\/payments\/[^/?]+\/captures$/).reply(function (uri, requestBody) {
    const call = record("POST", uri, this.req.headers as any, requestBody)
    const payment = payments.get(idOf(call.path))
    if (!payment) {
      return notFound(idOf(call.path))
    }
    const capture = { id: `cpt_Mock${payment.captures.length + 1}`, status: "succeeded" }
    payment.captures.push(capture)
    payment.status = "paid"
    return [
      201,
      {
        resource: "capture",
        id: capture.id,
        mode: "test",
        amount: payment.amount,
        status: capture.status,
        paymentId: payment.id,
        createdAt: "2026-11-02T10:05:00+00:00",
        _links: {
          self: link(`${MOLLIE_API}/v2/payments/${payment.id}/captures/${capture.id}`),
          payment: link(`${MOLLIE_API}/v2/payments/${payment.id}`),
          documentation: DOCS,
        },
      },
      HAL,
    ]
  })

  const refundJson = (payment: MolliePayment, refund: MolliePayment["refunds"][number]) => ({
    resource: "refund",
    id: refund.id,
    mode: "test",
    description: "",
    amount: refund.amount,
    metadata: null,
    paymentId: payment.id,
    status: refund.status,
    createdAt: "2026-11-02T10:06:00+00:00",
    _links: {
      self: link(`${MOLLIE_API}/v2/payments/${payment.id}/refunds/${refund.id}`),
      payment: link(`${MOLLIE_API}/v2/payments/${payment.id}`),
      documentation: DOCS,
    },
  })

  scope.post(/^\/v2\/payments\/[^/?]+\/refunds$/).reply(function (uri, requestBody) {
    const call = record("POST", uri, this.req.headers as any, requestBody)
    const payment = payments.get(idOf(call.path))
    if (!payment) {
      return notFound(idOf(call.path))
    }
    const refund = { id: `re_Mock${payment.refunds.length + 1}`, status: "pending", amount: call.body.amount }
    payment.refunds.push(refund)
    return [201, refundJson(payment, refund), HAL]
  })

  scope.get(/^\/v2\/payments\/[^/?]+\/refunds$/).query(true).reply(function (uri, requestBody) {
    const call = record("GET", uri, this.req.headers as any, requestBody)
    const payment = payments.get(idOf(call.path))
    if (!payment) {
      return notFound(idOf(call.path))
    }
    return [200, listJson(call.path, "refunds", payment.refunds.map((r) => refundJson(payment, r))), HAL]
  })

  scope.get("/v2/profiles/me").reply(function (uri, requestBody) {
    record("GET", uri, this.req.headers as any, requestBody)
    return [
      200,
      {
        resource: "profile",
        id: PROFILE_ID,
        mode: "test",
        name: "Gorgo Test Shop",
        website: "https://shop.example.com",
        email: "shop@example.com",
        phone: "+31201234567",
        businessCategory: null,
        status: "verified",
        createdAt: "2026-01-01T10:00:00+00:00",
        _links: { self: link(`${MOLLIE_API}/v2/profiles/me`), documentation: DOCS },
      },
      HAL,
    ]
  })

  const payment = (id: string) => {
    const found = payments.get(id)
    if (!found) {
      throw new Error(`mock Mollie has no payment ${id}`)
    }
    return found
  }

  return {
    calls,
    payments,
    /** Calls to `method path-pattern`, in order. */
    callsTo: (method: string, path: RegExp | string) =>
      calls.filter((c) => c.method === method && (typeof path === "string" ? c.path === path : path.test(c.path))),
    /** The payment created last. */
    latest: () => {
      const all = [...payments.values()]
      if (!all.length) {
        throw new Error("mock Mollie created no payment")
      }
      return all[all.length - 1]
    },
    get: payment,
    /** The buyer paid on Mollie's page. */
    pay: (id: string) => (payment(id).status = "paid"),
    /** The buyer authorized a payment created with `captureMode: manual`. */
    authorize: (id: string) => (payment(id).status = "authorized"),
    /** The buyer's payment failed. */
    fail: (id: string, failureReason = "insufficient_funds") => {
      const p = payment(id)
      p.status = "failed"
      p.failureReason = failureReason
    },
  }
}

export type MockMollie = ReturnType<typeof mockMollie>

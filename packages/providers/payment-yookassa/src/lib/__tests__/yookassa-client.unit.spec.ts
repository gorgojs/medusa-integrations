import axios from "axios"
import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { ErrorResponse, Payment, Refund, YooCheckout, apiUrl } from "../yookassa-client"

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const client = new YooCheckout({ shopId: "shop_1", secretKey: "secret_1" })
const basicAuth = `Basic ${Buffer.from("shop_1:secret_1").toString("base64")}`
const payment = { id: "pay_1", status: "pending", amount: { value: "10.00", currency: "RUB" } }

describe("YooCheckout", () => {
  it("targets the YooKassa v3 API", () => {
    expect(apiUrl).toBe("https://api.yookassa.ru/v3")
    expect(client.root).toBe(apiUrl)
  })

  it("creates a payment with basic auth, a generated idempotence key and the payload as body", async () => {
    let request!: Request
    let body: unknown
    server.use(
      http.post(`${apiUrl}/payments`, async (ctx) => {
        request = ctx.request
        body = await ctx.request.json()
        return HttpResponse.json(payment)
      })
    )

    const payload = { amount: { value: "10.00", currency: "RUB" }, capture: true }
    const result = await client.createPayment(payload)

    expect(request.headers.get("Authorization")).toBe(basicAuth)
    expect(request.headers.get("Idempotence-Key")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
    expect(body).toEqual(payload)
    expect(result).toBeInstanceOf(Payment)
    expect(result).toEqual(payment)
  })

  it("generates a new idempotence key for every call without one", async () => {
    const keys: (string | null)[] = []
    server.use(
      http.post(`${apiUrl}/payments`, ({ request }) => {
        keys.push(request.headers.get("Idempotence-Key"))
        return HttpResponse.json(payment)
      })
    )

    await client.createPayment({ amount: { value: "10.00", currency: "RUB" } })
    await client.createPayment({ amount: { value: "10.00", currency: "RUB" } })

    expect(keys[0]).not.toBe(keys[1])
  })

  it("captures with the given idempotence key", async () => {
    let request!: Request
    let body: unknown
    server.use(
      http.post(`${apiUrl}/payments/pay_1/capture`, async (ctx) => {
        request = ctx.request
        body = await ctx.request.json()
        return HttpResponse.json({ ...payment, status: "succeeded" })
      })
    )

    const result = await client.capturePayment(
      "pay_1",
      { amount: { value: "10.00", currency: "RUB" } },
      "idem-1"
    )

    expect(request.headers.get("Idempotence-Key")).toBe("idem-1")
    expect(body).toEqual({ amount: { value: "10.00", currency: "RUB" } })
    expect(result.status).toBe("succeeded")
  })

  it("cancels with an empty JSON object as body", async () => {
    let body: unknown
    server.use(
      http.post(`${apiUrl}/payments/pay_1/cancel`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...payment, status: "canceled" })
      })
    )

    const result = await client.cancelPayment("pay_1")

    expect(body).toEqual({})
    expect(result).toBeInstanceOf(Payment)
  })

  it("gets a payment and a refund", async () => {
    const refund = { id: "ref_1", payment_id: "pay_1", status: "succeeded" }
    server.use(
      http.get(`${apiUrl}/payments/pay_1`, ({ request }) => {
        expect(request.headers.get("Authorization")).toBe(basicAuth)
        expect(request.headers.get("Idempotence-Key")).toBeNull()
        return HttpResponse.json(payment)
      }),
      http.get(`${apiUrl}/refunds/ref_1`, () => HttpResponse.json(refund))
    )

    expect(await client.getPayment("pay_1")).toEqual(payment)
    const result = await client.getRefund("ref_1")
    expect(result).toBeInstanceOf(Refund)
    expect(result).toEqual(refund)
  })

  it("creates a refund", async () => {
    let body: unknown
    server.use(
      http.post(`${apiUrl}/refunds`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ id: "ref_1", status: "succeeded" })
      })
    )

    const payload = { payment_id: "pay_1", amount: { value: "5.00", currency: "RUB" } }
    const result = await client.createRefund(payload, "idem-2")

    expect(body).toEqual(payload)
    expect(result).toBeInstanceOf(Refund)
  })

  it("lists payments with the filters in the query string", async () => {
    let url = ""
    server.use(
      http.get(`${apiUrl}/payments`, ({ request }) => {
        url = request.url
        return HttpResponse.json({ type: "list", items: [payment], next_cursor: "c1" })
      })
    )

    const list = await client.getPaymentList({
      limit: 1,
      created_at: { value: "2026-01-01T00:00:00.000Z", mode: "gte" },
    })

    expect(url).toBe(`${apiUrl}/payments?limit=1&created_at.gte=2026-01-01T00:00:00.000Z`)
    expect(list.next_cursor).toBe("c1")
    expect(list.items[0]).toBeInstanceOf(Payment)

    await client.getPaymentList()
    expect(url).toBe(`${apiUrl}/payments`)
  })

  it("throws an ErrorResponse carrying the axios response", async () => {
    server.use(
      http.get(`${apiUrl}/payments/missing`, () =>
        HttpResponse.json(
          { type: "error", code: "not_found", description: "Payment not found" },
          { status: 404 }
        )
      )
    )

    const error: any = await client.getPayment("missing").catch((e) => e)

    expect(error).toBeInstanceOf(ErrorResponse)
    expect(axios.isAxiosError(error)).toBe(true)
    expect(error.response.status).toBe(404)
    expect(error.response.data).toEqual({
      type: "error",
      code: "not_found",
      description: "Payment not found",
    })
  })
})

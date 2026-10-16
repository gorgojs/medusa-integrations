import { AxiosError, AxiosHeaders } from "axios"
import { http, HttpResponse, delay } from "msw"
import { setupServer } from "msw/node"
import { MedusaError } from "@medusajs/framework/utils"
import {
  clearPayPalCredentialCache,
  PayPalApiError,
  PayPalClient,
  PayPalClientOptions,
} from "../paypal-client"

const SANDBOX = "https://api-m.sandbox.paypal.com"
const SECRET = "client-secret-value"

const server = setupServer()

let grantCalls = 0
let grantBodies: URLSearchParams[] = []
let grantAuthHeaders: string[] = []

function grantHandler(lifetimeSeconds = 32400) {
  return http.post(`${SANDBOX}/v1/oauth2/token`, async ({ request }) => {
    grantCalls++
    grantBodies.push(new URLSearchParams(await request.text()))
    grantAuthHeaders.push(request.headers.get("authorization") ?? "")
    return HttpResponse.json({
      access_token: `access-${grantCalls}`,
      token_type: "Bearer",
      expires_in: lifetimeSeconds,
    })
  })
}

function makeLogger() {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any
}

function makeClient(overrides: Partial<PayPalClientOptions> = {}) {
  const logger = makeLogger()
  const client = new PayPalClient({
    clientId: "client-id",
    clientSecret: SECRET,
    environment: "sandbox",
    logger,
    retryBaseDelayMs: 0,
    ...overrides,
  })
  // the generated clients are stubbed through moduleNameMapper, so their methods are set per test
  return { client, apis: client as any, logger }
}

function ok<T>(data: T, status = 200) {
  return { status, data, headers: { "paypal-debug-id": "dbg-ok" } }
}

function httpError(status: number, data: unknown, code?: string) {
  const config = { headers: new AxiosHeaders() } as any
  return new AxiosError("Request failed", code ?? AxiosError.ERR_BAD_RESPONSE, config, {}, {
    status,
    statusText: "",
    data,
    headers: {},
    config,
  })
}

function networkError(code: string) {
  return new AxiosError("Network trouble", code, { headers: new AxiosHeaders() } as any)
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
beforeEach(() => {
  clearPayPalCredentialCache()
  grantCalls = 0
  grantBodies = []
  grantAuthHeaders = []
})
afterEach(() => {
  server.resetHandlers()
  jest.restoreAllMocks()
})
afterAll(() => server.close())

describe("PayPalClient configuration", () => {
  it("points every generated client at the environment, with the credential function and a timeout", () => {
    const { apis } = makeClient({ timeoutMs: 1234 })
    for (const api of [apis.orders, apis.authorizations, apis.captures, apis.webhookSignatures, apis.webhooks]) {
      expect(api.configuration.options.basePath).toBe(SANDBOX)
      expect(typeof api.configuration.options.accessToken).toBe("function")
      expect(api.configuration.options.baseOptions).toEqual({ timeout: 1234 })
    }
  })

  it("uses the live host in live", () => {
    const { apis } = makeClient({ environment: "live" })
    expect(apis.orders.configuration.options.basePath).toBe("https://api-m.paypal.com")
  })
})

describe("PayPalClient calls", () => {
  it("creates an order with the request id and the full representation", async () => {
    const { client, apis } = makeClient()
    apis.orders.ordersCreate = jest.fn().mockResolvedValue(ok({ id: "O1", status: "CREATED" }, 201))
    const body = { intent: "CAPTURE", purchase_units: [{ amount: { currency_code: "EUR", value: "10.00" } }] }

    await expect(client.createOrder(body as any, "payses_1")).resolves.toEqual({ id: "O1", status: "CREATED" })
    expect(apis.orders.ordersCreate).toHaveBeenCalledWith(
      { orderRequest: body, payPalRequestId: "payses_1", prefer: "return=representation" },
      {}
    )
  })

  it("passes the request id to capture, authorize, void and refund calls", async () => {
    const { client, apis } = makeClient()
    apis.orders.ordersCapture = jest.fn().mockResolvedValue(ok({ id: "O1" }))
    apis.orders.ordersAuthorize = jest.fn().mockResolvedValue(ok({ id: "O1" }))
    apis.authorizations.authorizationsCapture = jest.fn().mockResolvedValue(ok({ id: "C1" }))
    apis.authorizations.authorizationsVoid = jest.fn().mockResolvedValue(ok({ id: "A1" }))
    apis.captures.capturesRefund = jest.fn().mockResolvedValue(ok({ id: "R1" }))

    await client.captureOrder("O1", "k-capture")
    await client.authorizeOrder("O1", "k-authorize")
    await client.captureAuthorization("A1", { final_capture: true }, "capt_1")
    await client.voidAuthorization("A1", "pay_1")
    await client.refundCapture("C1", { amount: { currency_code: "EUR", value: "5.00" } }, "ref_1")

    expect(apis.orders.ordersCapture.mock.calls[0][0]).toMatchObject({ id: "O1", payPalRequestId: "k-capture" })
    expect(apis.orders.ordersAuthorize.mock.calls[0][0]).toMatchObject({ id: "O1", payPalRequestId: "k-authorize" })
    expect(apis.authorizations.authorizationsCapture.mock.calls[0][0]).toMatchObject({
      authorizationId: "A1",
      captureRequest: { final_capture: true },
      payPalRequestId: "capt_1",
    })
    expect(apis.authorizations.authorizationsVoid.mock.calls[0][0]).toMatchObject({
      authorizationId: "A1",
      payPalRequestId: "pay_1",
    })
    expect(apis.captures.capturesRefund.mock.calls[0][0]).toMatchObject({
      captureId: "C1",
      refundRequest: { amount: { currency_code: "EUR", value: "5.00" } },
      payPalRequestId: "ref_1",
    })
  })

  it("sends PayPal-Mock-Response in the sandbox only", async () => {
    const sandbox = makeClient()
    sandbox.apis.orders.ordersCapture = jest.fn().mockResolvedValue(ok({ id: "O1" }))
    await sandbox.client.captureOrder("O1", "k", { mockResponse: "INSTRUMENT_DECLINED" })
    expect(sandbox.apis.orders.ordersCapture.mock.calls[0][1]).toEqual({
      headers: { "PayPal-Mock-Response": JSON.stringify({ mock_application_codes: "INSTRUMENT_DECLINED" }) },
    })

    const live = makeClient({ environment: "live" })
    live.apis.orders.ordersCapture = jest.fn().mockResolvedValue(ok({ id: "O1" }))
    await live.client.captureOrder("O1", "k", { mockResponse: "INSTRUMENT_DECLINED" })
    expect(live.apis.orders.ordersCapture.mock.calls[0][1]).toEqual({})
    expect(live.logger.warn).toHaveBeenCalled()
  })

  it("calls the webhook endpoints of the generated client", async () => {
    const { client, apis } = makeClient()
    apis.webhookSignatures.verifyWebhookSignaturePost = jest
      .fn()
      .mockResolvedValue(ok({ verification_status: "SUCCESS" }))
    apis.webhooks.webhooksGet = jest.fn().mockResolvedValue(ok({ id: "WH1", event_types: [] }))
    const fields = {
      auth_algo: "SHA256withRSA",
      cert_url: "https://api-m.paypal.com/v1/notifications/certs/CERT-1",
      transmission_id: "T1",
      transmission_sig: "SIG",
      transmission_time: "2026-10-12T10:00:00Z",
      webhook_id: "WH1",
    }

    await expect(client.verifyWebhookSignature(fields, '{"id":"E1"}')).resolves.toEqual({ verification_status: "SUCCESS" })
    await expect(client.getWebhook("WH1")).resolves.toMatchObject({ id: "WH1" })
    const sent = apis.webhookSignatures.verifyWebhookSignaturePost.mock.calls[0][0].verifyWebhookSignature
    expect(JSON.parse(sent)).toEqual({ ...fields, webhook_event: { id: "E1" } })
    expect(apis.webhooks.webhooksGet.mock.calls[0][0]).toEqual({ webhookId: "WH1" })
  })

  it("puts the event into the verification body byte for byte", async () => {
    const { client, apis } = makeClient()
    apis.webhookSignatures.verifyWebhookSignaturePost = jest
      .fn()
      .mockResolvedValue(ok({ verification_status: "SUCCESS" }))
    // escapes that JSON.parse and JSON.stringify would rewrite
    const raw = '{"id":"E1","summary":"Caf\\u00e9 \\/ 10.0","amount":1.0}'

    await client.verifyWebhookSignature({ webhook_id: "WH1" } as any, raw)

    const sent: string = apis.webhookSignatures.verifyWebhookSignaturePost.mock.calls[0][0].verifyWebhookSignature
    expect(sent).toBe(`{"webhook_id":"WH1","webhook_event":${raw}}`)
  })
})

describe("PayPalClient retries", () => {
  it("retries a call with a request id on 503 and returns the later success", async () => {
    const { client, apis, logger } = makeClient()
    apis.orders.ordersCapture = jest
      .fn()
      .mockRejectedValueOnce(httpError(503, {}))
      .mockRejectedValueOnce(httpError(503, {}))
      .mockResolvedValue(ok({ id: "O1", status: "COMPLETED" }))

    await expect(client.captureOrder("O1", "k")).resolves.toMatchObject({ status: "COMPLETED" })
    expect(apis.orders.ordersCapture).toHaveBeenCalledTimes(3)
    expect(logger.warn).toHaveBeenCalledTimes(2)
  })

  it("retries a GET on 429 and on a dropped connection", async () => {
    const { client, apis } = makeClient()
    apis.orders.ordersGet = jest
      .fn()
      .mockRejectedValueOnce(httpError(429, {}))
      .mockRejectedValueOnce(networkError("ECONNRESET"))
      .mockResolvedValue(ok({ id: "O1" }))

    await expect(client.getOrder("O1")).resolves.toEqual({ id: "O1" })
    expect(apis.orders.ordersGet).toHaveBeenCalledTimes(3)
  })

  it("gives up after the configured attempts", async () => {
    const { client, apis } = makeClient({ attempts: 2 })
    apis.orders.ordersGet = jest.fn().mockRejectedValue(httpError(500, { name: "INTERNAL_SERVER_ERROR" }))

    await expect(client.getOrder("O1")).rejects.toBeInstanceOf(PayPalApiError)
    expect(apis.orders.ordersGet).toHaveBeenCalledTimes(2)
  })

  it("does not retry a 422", async () => {
    const { client, apis } = makeClient()
    apis.orders.ordersCapture = jest
      .fn()
      .mockRejectedValue(httpError(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "INSTRUMENT_DECLINED" }] }))

    await expect(client.captureOrder("O1", "k")).rejects.toThrow("INSTRUMENT_DECLINED")
    expect(apis.orders.ordersCapture).toHaveBeenCalledTimes(1)
  })

  it("does not retry a PATCH, which carries no request id", async () => {
    const { client, apis } = makeClient()
    apis.orders.ordersPatch = jest.fn().mockRejectedValue(httpError(503, {}))

    await expect(client.patchOrder("O1", [])).rejects.toBeInstanceOf(PayPalApiError)
    expect(apis.orders.ordersPatch).toHaveBeenCalledTimes(1)
  })

  it("retries a timeout and reports it as UNEXPECTED_STATE", async () => {
    const { client, apis } = makeClient()
    apis.orders.ordersGet = jest.fn().mockRejectedValue(networkError("ECONNABORTED"))

    const error = await client.getOrder("O1").catch((e) => e)
    expect(apis.orders.ordersGet).toHaveBeenCalledTimes(3)
    expect(error).toBeInstanceOf(PayPalApiError)
    expect(error.type).toBe(MedusaError.Types.UNEXPECTED_STATE)
    expect(error.message).toBe("PayPal getOrder failed: ECONNABORTED")
  })
})

describe("PayPalClient errors", () => {
  it("keeps PayPal's name, issue, details and debug id", async () => {
    const { client, apis } = makeClient()
    const body = {
      name: "UNPROCESSABLE_ENTITY",
      debug_id: "dbg123",
      details: [{ issue: "INSTRUMENT_DECLINED", description: "The instrument was declined" }],
    }
    apis.orders.ordersCapture = jest.fn().mockRejectedValue(httpError(422, body))

    const error = await client.captureOrder("O1", "k").catch((e) => e)
    expect(error).toBeInstanceOf(MedusaError)
    expect(error.type).toBe(MedusaError.Types.INVALID_DATA)
    expect(error.code).toBe("INSTRUMENT_DECLINED")
    expect(error.status).toBe(422)
    expect(error.debugId).toBe("dbg123")
    expect(error.issue).toBe("INSTRUMENT_DECLINED")
    expect(error.data).toEqual(body)
    expect(error.message).toBe("PayPal captureOrder failed: UNPROCESSABLE_ENTITY INSTRUMENT_DECLINED debug_id=dbg123")
  })

  it.each([
    [400, MedusaError.Types.INVALID_DATA],
    [401, MedusaError.Types.UNAUTHORIZED],
    [403, MedusaError.Types.UNAUTHORIZED],
    [404, MedusaError.Types.UNEXPECTED_STATE],
  ])("maps HTTP %s to %s", async (status, type) => {
    const { client, apis } = makeClient()
    apis.orders.ordersGet = jest.fn().mockRejectedValue(httpError(status, { name: "SOME_ERROR" }))

    await expect(client.getOrder("O1")).rejects.toMatchObject({ type, status })
  })
})

describe("PayPalClient OAuth credentials", () => {
  it("requests the credential once for parallel calls and reuses it", async () => {
    server.use(grantHandler())
    const { client } = makeClient()

    const tokens = await Promise.all([1, 2, 3, 4, 5].map(() => client.getAccessToken()))
    expect(new Set(tokens)).toEqual(new Set(["access-1"]))
    expect(grantCalls).toBe(1)

    await client.getAccessToken()
    expect(grantCalls).toBe(1)
    expect(grantBodies[0].get("grant_type")).toBe("client_credentials")
    expect(grantAuthHeaders[0]).toBe(`Basic ${Buffer.from(`client-id:${SECRET}`).toString("base64")}`)
  })

  it("shares the credential between clients of the same app", async () => {
    server.use(grantHandler())
    await makeClient().client.getAccessToken()
    await makeClient().client.getAccessToken()
    expect(grantCalls).toBe(1)
  })

  it("requests a new credential when the secret changes", async () => {
    server.use(grantHandler())
    await makeClient().client.getAccessToken()
    await makeClient({ clientSecret: "another-secret" }).client.getAccessToken()
    expect(grantCalls).toBe(2)
  })

  it("refreshes the credential two minutes before it expires", async () => {
    server.use(grantHandler(3600))
    const { client } = makeClient()
    const start = Date.now()
    const now = jest.spyOn(Date, "now").mockReturnValue(start)

    await client.getAccessToken()
    now.mockReturnValue(start + (3600 - 121) * 1000)
    await client.getAccessToken()
    expect(grantCalls).toBe(1)

    now.mockReturnValue(start + (3600 - 119) * 1000)
    await expect(client.getAccessToken()).resolves.toBe("access-2")
    expect(grantCalls).toBe(2)
  })

  it("turns rejected credentials into UNAUTHORIZED with PayPal's description", async () => {
    server.use(
      http.post(`${SANDBOX}/v1/oauth2/token`, () =>
        HttpResponse.json({ error: "invalid_client", error_description: "Client Authentication failed" }, { status: 401 })
      )
    )
    const { client } = makeClient()

    await expect(client.getAccessToken()).rejects.toMatchObject({
      type: MedusaError.Types.UNAUTHORIZED,
      message: "PayPal oauth failed: invalid_client Client Authentication failed",
    })
  })

  it("times out a hanging credential request", async () => {
    server.use(
      http.post(`${SANDBOX}/v1/oauth2/token`, async () => {
        await delay(500)
        return HttpResponse.json({ access_token: "late", expires_in: 3600 })
      })
    )
    const { client } = makeClient({ timeoutMs: 50, attempts: 1 })

    await expect(client.getAccessToken()).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
      code: "ECONNABORTED",
    })
  })
})

describe("PayPalClient logging", () => {
  it("logs requests and responses without credentials or secrets", async () => {
    server.use(grantHandler())
    const { client, apis, logger } = makeClient()
    apis.orders.ordersGet = jest.fn().mockImplementation(async () => {
      // what the generated client does before each request
      await apis.orders.configuration.options.accessToken()
      return ok({ id: "O1" })
    })

    await client.getOrder("O1")
    const logged = [...logger.debug.mock.calls, ...logger.warn.mock.calls].map((call) => String(call[0])).join("\n")

    expect(logged).toContain("PayPalClient.getOrder request:")
    expect(logged).toContain("PayPalClient.getOrder response:")
    expect(logged).toContain("dbg-ok")
    expect(logged).not.toMatch(/authorization/i)
    expect(logged).not.toContain(SECRET)
    expect(logged).not.toContain("access-1")
  })
})

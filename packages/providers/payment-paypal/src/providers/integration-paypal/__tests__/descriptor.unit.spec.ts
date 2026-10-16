import { AxiosError, AxiosHeaders } from "axios"
import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import { collectValidationIssues } from "@gorgo/medusa-integration"
import { clearPayPalCredentialCache } from "../../../lib/paypal-client"
import { WebhooksApi } from "../../../lib/paypal-webhooks-client"
import { REQUIRED_WEBHOOK_EVENTS } from "../../../utils/webhook"
import PayPalIntegrationProvider from "../services/paypal-integration"

jest.mock("@medusajs/framework/logger", () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

const descriptor = new PayPalIntegrationProvider().descriptor
const schema = descriptor.optionsSchema

const validBase = {
  clientId: "client-id",
  clientSecret: "client-secret",
}

const issuePaths = (input: unknown): string[] => {
  const res = schema.safeParse(input)
  return res.success ? [] : res.error.issues.map((i) => String(i.path[0]))
}

describe("PayPal integration descriptor schema", () => {
  it.each(["clientId", "clientSecret"])("requires %s", (field) => {
    expect(issuePaths({ ...validBase, [field]: undefined })).toContain(field)
    expect(issuePaths({ ...validBase, [field]: "" })).toContain(field)
  })

  it("accepts minimal valid options and applies defaults", () => {
    const res = schema.safeParse(validBase)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data).toMatchObject({ environment: "sandbox", intent: "capture", landingPage: "NO_PREFERENCE" })
      expect(res.data.webhookId).toBeUndefined()
    }
    expect(collectValidationIssues(descriptor, validBase)).toEqual([])
  })

  it.each<[string, number]>([
    ["brandName", 127],
    ["softDescriptor", 22],
  ])("limits %s to %i characters", (field, max) => {
    expect(issuePaths({ ...validBase, [field]: "x".repeat(max) })).toEqual([])
    expect(issuePaths({ ...validBase, [field]: "x".repeat(max + 1) })).toContain(field)
  })

  it.each<[string, string]>([
    ["environment", "production"],
    ["intent", "sale"],
    ["landingPage", "BILLING"],
  ])("rejects an unknown %s", (field, value) => {
    expect(issuePaths({ ...validBase, [field]: value })).toContain(field)
  })

  it("keeps the secret out of the admin", () => {
    expect((descriptor.options as any).clientSecret.secret).toBe(true)
  })

  it.each(["environment", "intent", "landingPage"])("%s labels every value it declares", (field) => {
    const opt = (descriptor.options as any)[field]
    for (const value of opt.values) expect(opt.valueLabels[value]).toBeDefined()
  })

  it("puts the intent in the side column", () => {
    expect(descriptor.sections.find((s) => s.id === "behavior")).toMatchObject({ column: "side", options: ["intent"] })
  })
})

describe("PayPal integration testConnection", () => {
  const SANDBOX = "https://api-m.sandbox.paypal.com"
  const LIVE = "https://api-m.paypal.com"
  const server = setupServer()
  const webhooksGet = jest.fn()

  const grant = (base: string) =>
    http.post(`${base}/v1/oauth2/token`, () =>
      HttpResponse.json({ access_token: "access", token_type: "Bearer", expires_in: 32400 })
    )

  const options = (overrides: Record<string, unknown> = {}) => ({
    ...schema.parse(validBase),
    ...overrides,
  })

  const httpError = (status: number, data: unknown) => {
    const config = { headers: new AxiosHeaders() } as any
    return new AxiosError("Request failed", AxiosError.ERR_BAD_REQUEST, config, {}, {
      status,
      statusText: "",
      data,
      headers: {},
      config,
    })
  }

  const webhook = (names: string[]) => ({
    status: 200,
    headers: {},
    data: { id: "WH-1", url: "https://shop.test/hooks/payment/paypal_paypal", event_types: names.map((name) => ({ name })) },
  })

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" })
    ;(WebhooksApi.prototype as any).webhooksGet = webhooksGet
  })
  beforeEach(() => {
    clearPayPalCredentialCache()
    webhooksGet.mockReset()
  })
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it("passes with valid keys and no webhook id", async () => {
    server.use(grant(SANDBOX))

    await expect(descriptor.testConnection!({ options: options() })).resolves.toEqual({ status: "passed" })
    expect(webhooksGet).not.toHaveBeenCalled()
  })

  it("asks the environment the merchant chose", async () => {
    server.use(grant(LIVE))

    await expect(descriptor.testConnection!({ options: options({ environment: "live" }) })).resolves.toEqual({
      status: "passed",
    })
  })

  it("fails with PayPal's description of wrong keys", async () => {
    server.use(
      http.post(`${SANDBOX}/v1/oauth2/token`, () =>
        HttpResponse.json({ error: "invalid_client", error_description: "Client Authentication failed" }, { status: 401 })
      )
    )

    await expect(descriptor.testConnection!({ options: options() })).resolves.toEqual({
      status: "failed",
      message: "Client Authentication failed",
    })
  })

  it("fails when a key is missing, without calling PayPal", async () => {
    await expect(descriptor.testConnection!({ options: options({ clientSecret: "" }) })).resolves.toMatchObject({
      status: "failed",
    })
  })

  it("passes when the webhook listens to the events the provider needs", async () => {
    server.use(grant(SANDBOX))
    webhooksGet.mockResolvedValue(webhook([...REQUIRED_WEBHOOK_EVENTS, "CHECKOUT.ORDER.APPROVED"]))

    await expect(descriptor.testConnection!({ options: options({ webhookId: "WH-1" }) })).resolves.toEqual({
      status: "passed",
    })
    expect(webhooksGet.mock.calls[0][0]).toEqual({ webhookId: "WH-1" })
  })

  it("passes for a webhook subscribed to every event", async () => {
    server.use(grant(SANDBOX))
    webhooksGet.mockResolvedValue(webhook(["*"]))

    await expect(descriptor.testConnection!({ options: options({ webhookId: "WH-1" }) })).resolves.toEqual({
      status: "passed",
    })
  })

  it("names the event the webhook does not listen to", async () => {
    server.use(grant(SANDBOX))
    webhooksGet.mockResolvedValue(webhook(["PAYMENT.AUTHORIZATION.CREATED"]))

    await expect(descriptor.testConnection!({ options: options({ webhookId: "WH-1" }) })).resolves.toEqual({
      status: "failed",
      message: "The webhook is not subscribed to PAYMENT.CAPTURE.COMPLETED",
    })
  })

  it("fails for a webhook id from another app or environment", async () => {
    server.use(grant(SANDBOX))
    webhooksGet.mockRejectedValue(httpError(404, { name: "RESOURCE_NOT_FOUND", details: [{ issue: "INVALID_RESOURCE_ID" }] }))

    await expect(descriptor.testConnection!({ options: options({ webhookId: "WH-LIVE" }) })).resolves.toEqual({
      status: "failed",
      message: "Webhook WH-LIVE was not found for this app in the sandbox environment",
    })
  })

  it("reports any other PayPal failure without throwing", async () => {
    server.use(grant(SANDBOX))
    webhooksGet.mockRejectedValue(httpError(403, { name: "NOT_AUTHORIZED" }))

    await expect(descriptor.testConnection!({ options: options({ webhookId: "WH-1" }) })).resolves.toEqual({
      status: "failed",
      message: "PayPal getWebhook failed: NOT_AUTHORIZED",
    })
  })
})

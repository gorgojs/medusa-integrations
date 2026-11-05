import { MedusaError } from "@medusajs/framework/utils"
import { collectValidationIssues } from "@gorgo/medusa-integration"
import { AuthorizeNetApiError } from "../../../lib/authorizenet-client"
import { REQUIRED_WEBHOOK_EVENTS } from "../../../utils/webhook"
import AuthorizeNetIntegrationProvider from "../services/authorizenet-integration"

jest.mock("@medusajs/framework/logger", () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

const client = {
  getMerchantDetails: jest.fn(),
  listWebhooks: jest.fn(),
}
const constructed: Record<string, unknown>[] = []

jest.mock("../../../lib/authorizenet-client", () => {
  const actual = jest.requireActual("../../../lib/authorizenet-client")
  return {
    ...actual,
    AuthorizeNetClient: jest.fn().mockImplementation((options: Record<string, unknown>) => {
      constructed.push(options)
      return client
    }),
  }
})

const descriptor = new AuthorizeNetIntegrationProvider().descriptor
const schema = descriptor.optionsSchema

const validBase = {
  apiLoginId: "login-123",
  transactionKey: "SECRET-transaction-key",
  publicClientKey: "public-client-key",
}

const issuePaths = (input: unknown): string[] => {
  const res = schema.safeParse(input)
  return res.success ? [] : res.error.issues.map((i) => String(i.path[0]))
}

describe("Authorize.net integration descriptor schema", () => {
  it.each(["apiLoginId", "transactionKey", "publicClientKey"])("requires %s", (field) => {
    expect(issuePaths({ ...validBase, [field]: undefined })).toContain(field)
    expect(issuePaths({ ...validBase, [field]: "" })).toContain(field)
  })

  it("accepts minimal valid options and applies defaults", () => {
    const res = schema.safeParse(validBase)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data).toMatchObject({ environment: "sandbox", capture: "automatic", googlePay: false })
      expect(res.data.signatureKey).toBeUndefined()
    }
    expect(collectValidationIssues(descriptor, validBase)).toEqual([])
  })

  it("takes the environment only as sandbox or production (regression В8)", () => {
    expect(issuePaths({ ...validBase, environment: "production" })).toEqual([])
    expect(issuePaths({ ...validBase, environment: "live" })).toContain("environment")
    expect(issuePaths({ ...validBase, enviornment: "production" })).toEqual([])
    const res = schema.safeParse({ ...validBase, enviornment: "production" })
    expect(res.success && res.data.environment).toBe("sandbox")
  })

  it("rejects an unknown capture mode", () => {
    expect(issuePaths({ ...validBase, capture: "later" })).toContain("capture")
  })

  it("needs the Google merchant ID for Google Pay in production only", () => {
    const production = { ...validBase, environment: "production", googlePay: true }
    expect(collectValidationIssues(descriptor, production).map((issue) => issue.message).join()).toContain(
      "Google Pay in production needs your Google merchant ID"
    )
    expect(collectValidationIssues(descriptor, { ...production, googleMerchantId: "BCR2DN4T" })).toEqual([])
    expect(collectValidationIssues(descriptor, { ...validBase, googlePay: true })).toEqual([])
    expect(collectValidationIssues(descriptor, { ...validBase, environment: "production" })).toEqual([])
  })

  it("keeps the secrets out of the admin", () => {
    const options = descriptor.options as any
    expect(options.transactionKey.secret).toBe(true)
    expect(options.signatureKey.secret).toBe(true)
    expect(options.apiLoginId.secret).toBeUndefined()
    expect(options.publicClientKey.secret).toBeUndefined()
  })

  it("labels every environment and capture mode", () => {
    const options = descriptor.options as any
    for (const name of ["environment", "capture"]) {
      for (const value of options[name].values) expect(options[name].valueLabels[value]).toBeDefined()
    }
  })

  it("lays out three sections with the capture mode in the side column", () => {
    expect(descriptor.sections.map((s) => s.id)).toEqual(["credentials", "behavior", "wallets"])
    expect(descriptor.sections.find((s) => s.id === "behavior")).toMatchObject({ column: "side", options: ["capture"] })
  })
})

describe("Authorize.net integration testConnection", () => {
  const webhook = (overrides: Record<string, unknown> = {}) => ({
    webhookId: "wh-1",
    url: "https://shop.example/hooks/payment/authorizenet_authorizenet",
    status: "active",
    eventTypes: REQUIRED_WEBHOOK_EVENTS,
    ...overrides,
  })

  beforeEach(() => {
    constructed.length = 0
    client.getMerchantDetails
      .mockReset()
      .mockResolvedValue({ messages: { resultCode: "Ok" }, isTestMode: false, gatewayId: "123456", currencies: ["USD"] })
    client.listWebhooks.mockReset().mockResolvedValue([webhook()])
  })

  it("passes with working keys and a matching webhook, naming the currencies and the gateway ID", async () => {
    const result = await descriptor.testConnection!({ options: { ...validBase, signatureKey: "A1B2" } })
    expect(result).toEqual({ status: "passed", message: "Currencies: USD. Payment Gateway ID: 123456" })
    expect(constructed[0]).toMatchObject({ environment: "sandbox", apiLoginId: "login-123" })
  })

  it("uses the production endpoint for production keys", async () => {
    await descriptor.testConnection!({ options: { ...validBase, environment: "production" } })
    expect(constructed[0]).toMatchObject({ environment: "production" })
  })

  it("reads currencies sent as a nested list", async () => {
    client.getMerchantDetails.mockResolvedValue({ messages: { resultCode: "Ok" }, currencies: { currency: ["USD", "CAD"] } })
    expect(await descriptor.testConnection!({ options: validBase })).toEqual({ status: "passed", message: "Currencies: USD, CAD" })
  })

  it("does not look for a webhook without a signature key", async () => {
    expect(await descriptor.testConnection!({ options: validBase })).toMatchObject({ status: "passed" })
    expect(client.listWebhooks).not.toHaveBeenCalled()
  })

  it("fails without keys", async () => {
    expect(await descriptor.testConnection!({ options: {} })).toMatchObject({ status: "failed" })
    expect(client.getMerchantDetails).not.toHaveBeenCalled()
  })

  it("fails with Authorize.net's message and the environment for wrong keys", async () => {
    client.getMerchantDetails.mockRejectedValue(
      new AuthorizeNetApiError(
        MedusaError.Types.UNAUTHORIZED,
        "Authorize.net getMerchantDetails failed: User authentication failed due to invalid authentication values. code=E00007",
        { anetCode: "E00007" }
      )
    )
    const result = await descriptor.testConnection!({ options: validBase })
    expect(result.status).toBe("failed")
    expect(result.message).toContain("User authentication failed")
    expect(result.message).toContain("Check that the keys belong to the sandbox environment")
  })

  it("fails for an account in Test Mode", async () => {
    client.getMerchantDetails.mockResolvedValue({ messages: { resultCode: "Ok" }, isTestMode: true })
    const result = await descriptor.testConnection!({ options: validBase })
    expect(result).toMatchObject({ status: "failed" })
    expect(result.message).toContain("Live Mode")
  })

  it.each([
    ["no webhook for Medusa", [webhook({ url: "https://shop.example/other" })], "No active webhook"],
    ["an inactive webhook", [webhook({ status: "inactive" })], "No active webhook"],
    [
      "a webhook without the fraud events",
      [webhook({ eventTypes: ["net.authorize.payment.priorAuthCapture.created"] })],
      "net.authorize.payment.fraud.approved, net.authorize.payment.fraud.declined",
    ],
  ])("fails with %s", async (_, data, message) => {
    client.listWebhooks.mockResolvedValue(data)
    const result = await descriptor.testConnection!({ options: { ...validBase, signatureKey: "A1B2" } })
    expect(result).toMatchObject({ status: "failed" })
    expect(result.message).toContain(message)
  })

  it("accepts a matching webhook among others", async () => {
    client.listWebhooks.mockResolvedValue([webhook({ eventTypes: ["net.authorize.customer.created"] }), webhook()])
    expect(await descriptor.testConnection!({ options: { ...validBase, signatureKey: "A1B2" } })).toMatchObject({
      status: "passed",
    })
  })

  it("fails when the webhooks cannot be read", async () => {
    client.listWebhooks.mockRejectedValue(new Error("Authorize.net listWebhooks failed: HTTP 401"))
    expect(await descriptor.testConnection!({ options: { ...validBase, signatureKey: "A1B2" } })).toMatchObject({
      status: "failed",
      message: "Authorize.net listWebhooks failed: HTTP 401",
    })
  })
})

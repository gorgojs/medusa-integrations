import Stripe from "stripe"
import { collectValidationIssues } from "@gorgo/medusa-integration"
import { REQUIRED_WEBHOOK_EVENTS } from "../../../utils/webhook"
import StripeIntegrationProvider from "../services/stripe-integration"

jest.mock("@medusajs/framework/logger", () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

const stripe = {
  paymentIntents: { list: jest.fn() },
  webhookEndpoints: { list: jest.fn() },
}

jest.mock("../../../lib/stripe-client", () => ({
  ...jest.requireActual("../../../lib/stripe-client"),
  getStripe: jest.fn(() => stripe),
}))

const descriptor = new StripeIntegrationProvider().descriptor
const schema = descriptor.optionsSchema

const validBase = {
  secretKey: "sk_test_123",
  publishableKey: "pk_test_123",
}

const issuePaths = (input: unknown): string[] => {
  const res = schema.safeParse(input)
  return res.success ? [] : res.error.issues.map((i) => String(i.path[0]))
}

describe("Stripe integration descriptor schema", () => {
  it.each(["secretKey", "publishableKey"])("requires %s", (field) => {
    expect(issuePaths({ ...validBase, [field]: undefined })).toContain(field)
    expect(issuePaths({ ...validBase, [field]: "" })).toContain(field)
  })

  it("accepts minimal valid options and applies defaults", () => {
    const res = schema.safeParse(validBase)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data).toMatchObject({ capture: "automatic", sendReceiptEmail: false })
      expect(res.data.webhookSecret).toBeUndefined()
    }
    expect(collectValidationIssues(descriptor, validBase)).toEqual([])
  })

  it.each([
    ["secretKey", "rk_live_abc", true],
    ["secretKey", "pk_test_abc", false],
    ["secretKey", "sk_prod_abc", false],
    ["publishableKey", "sk_test_abc", false],
    ["webhookSecret", "whsec_abc", true],
    ["webhookSecret", "secret", false],
    ["paymentMethodConfiguration", "pmc_abc", true],
    ["paymentMethodConfiguration", "cfg_abc", false],
  ])("checks the prefix of %s: %p", (field, value, ok) => {
    const paths = issuePaths({ ...validBase, [field]: value })
    expect(paths.includes(field)).toBe(!ok)
  })

  it("rejects keys of different modes", () => {
    const issues = collectValidationIssues(descriptor, { ...validBase, secretKey: "sk_live_123" })
    expect(issues.map((issue) => issue.message).join()).toContain("test mode and the secret key for live mode")
    expect(collectValidationIssues(descriptor, { ...validBase, secretKey: "rk_test_123" })).toEqual([])
  })

  it.each(["SHOP", "Order 42"])("accepts the statement descriptor suffix %p", (value) => {
    expect(collectValidationIssues(descriptor, { ...validBase, statementDescriptorSuffix: value })).toEqual([])
  })

  it.each(["Заказ", "12345", "SHOP*1"])("rejects the statement descriptor suffix %p", (value) => {
    expect(collectValidationIssues(descriptor, { ...validBase, statementDescriptorSuffix: value })).not.toEqual([])
  })

  it("rejects an unknown capture mode", () => {
    expect(issuePaths({ ...validBase, capture: "later" })).toContain("capture")
  })

  it("keeps the secrets out of the admin", () => {
    expect((descriptor.options as any).secretKey.secret).toBe(true)
    expect((descriptor.options as any).webhookSecret.secret).toBe(true)
    expect((descriptor.options as any).publishableKey.secret).toBeUndefined()
  })

  it("labels every capture mode", () => {
    const opt = (descriptor.options as any).capture
    for (const value of opt.values) expect(opt.valueLabels[value]).toBeDefined()
  })

  it("puts the capture mode in the side column", () => {
    expect(descriptor.sections.find((s) => s.id === "behavior")).toMatchObject({ column: "side", options: ["capture"] })
  })
})

describe("Stripe integration testConnection", () => {
  const endpoint = (overrides: Record<string, unknown> = {}) => ({
    url: "https://shop.example/hooks/payment/stripe_stripe",
    status: "enabled",
    enabled_events: REQUIRED_WEBHOOK_EVENTS,
    ...overrides,
  })

  beforeEach(() => {
    stripe.paymentIntents.list.mockReset().mockResolvedValue({ data: [] })
    stripe.webhookEndpoints.list.mockReset().mockResolvedValue({ data: [endpoint()] })
  })

  it("passes with a working key and a matching webhook endpoint", async () => {
    expect(await descriptor.testConnection!({ options: { ...validBase, webhookSecret: "whsec_1" } })).toEqual({ status: "passed" })
    expect(stripe.paymentIntents.list).toHaveBeenCalledWith({ limit: 1 })
  })

  it("does not look for an endpoint without a webhook secret", async () => {
    expect(await descriptor.testConnection!({ options: validBase })).toEqual({ status: "passed" })
    expect(stripe.webhookEndpoints.list).not.toHaveBeenCalled()
  })

  it("fails without a key", async () => {
    expect(await descriptor.testConnection!({ options: {} })).toMatchObject({ status: "failed" })
  })

  it("fails with Stripe's message for a wrong key", async () => {
    stripe.paymentIntents.list.mockRejectedValue(
      new Stripe.errors.StripeAuthenticationError({ message: "Invalid API Key provided: sk_test_***123" } as any)
    )
    const result = await descriptor.testConnection!({ options: validBase })
    expect(result.status).toBe("failed")
    expect(result.message).toContain("Invalid API Key provided")
  })

  it.each([
    ["no endpoint for Medusa", [endpoint({ url: "https://shop.example/other" })], "No enabled webhook endpoint"],
    ["a disabled endpoint", [endpoint({ status: "disabled" })], "No enabled webhook endpoint"],
    ["an endpoint without the authorized event", [endpoint({ enabled_events: ["payment_intent.succeeded"] })], "payment_intent.amount_capturable_updated"],
  ])("fails with %s", async (_, data, message) => {
    stripe.webhookEndpoints.list.mockResolvedValue({ data })
    const result = await descriptor.testConnection!({ options: { ...validBase, webhookSecret: "whsec_1" } })
    expect(result).toMatchObject({ status: "failed" })
    expect(result.message).toContain(message)
  })

  it("accepts an endpoint that sends every event, among others that do not", async () => {
    stripe.webhookEndpoints.list.mockResolvedValue({
      data: [endpoint({ enabled_events: ["charge.refunded"] }), endpoint({ enabled_events: ["*"] })],
    })
    expect(await descriptor.testConnection!({ options: { ...validBase, webhookSecret: "whsec_1" } })).toEqual({ status: "passed" })
  })

  it("passes when a restricted key may not read webhook endpoints", async () => {
    stripe.webhookEndpoints.list.mockRejectedValue(new Stripe.errors.StripePermissionError({ message: "no access" } as any))
    expect(await descriptor.testConnection!({ options: { ...validBase, webhookSecret: "whsec_1" } })).toEqual({ status: "passed" })
  })

  it("fails on any other error while reading webhook endpoints", async () => {
    stripe.webhookEndpoints.list.mockRejectedValue(new Stripe.errors.StripeAPIError({ message: "down" } as any))
    expect(await descriptor.testConnection!({ options: { ...validBase, webhookSecret: "whsec_1" } })).toMatchObject({
      status: "failed",
    })
  })
})

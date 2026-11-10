import { collectValidationIssues } from "@gorgo/medusa-integration"
import { MedusaError } from "@medusajs/framework/utils"
import { MollieApiError } from "../../../lib/mollie-client"
import MollieIntegrationProvider from "../services/mollie-integration"

jest.mock("@medusajs/framework/logger", () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

const getCurrent = jest.fn()
const getMollie = jest.fn()

jest.mock("../../../lib/mollie-client", () => {
  const actual = jest.requireActual("../../../lib/mollie-client")
  return { ...actual, getMollie: (...args: unknown[]) => getMollie(...args) }
})

const descriptor = new MollieIntegrationProvider().descriptor
const schema = descriptor.optionsSchema

const validBase = {
  apiKey: "test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM",
  webhookUrl: "https://api.example.com/hooks/payment/mollie_mollie",
}

const issuePaths = (input: unknown): string[] => {
  const res = schema.safeParse(input)
  return res.success ? [] : res.error.issues.map((i) => String(i.path[0]))
}

const messages = (input: unknown): string =>
  collectValidationIssues(descriptor, input as Record<string, unknown>)
    .map((issue) => issue.message)
    .join()

describe("Mollie integration descriptor schema", () => {
  it.each(["apiKey", "webhookUrl"])("requires %s", (field) => {
    expect(issuePaths({ ...validBase, [field]: undefined })).toContain(field)
    expect(issuePaths({ ...validBase, [field]: "" })).toContain(field)
  })

  it("accepts minimal valid options and applies defaults", () => {
    const res = schema.safeParse(validBase)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data).toMatchObject({ capture: "automatic" })
      expect(res.data.paymentDescription).toBeUndefined()
    }
    expect(collectValidationIssues(descriptor, validBase)).toEqual([])
  })

  it("takes test_ and live_ API keys only", () => {
    expect(issuePaths({ ...validBase, apiKey: "live_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM" })).toEqual([])
    expect(issuePaths({ ...validBase, apiKey: "dHar4XY7LxsDOtmnkVtjNVWXLSlXsM" })).toContain("apiKey")
    expect(issuePaths({ ...validBase, apiKey: "access_abc123" })).toContain("apiKey")
    expect(issuePaths({ ...validBase, apiKey: "test_" })).toContain("apiKey")
  })

  it("rejects a webhook URL over http", () => {
    expect(messages({ ...validBase, webhookUrl: "http://api.example.com/hooks/payment/mollie_mollie" })).toContain(
      "https only"
    )
  })

  it("rejects a webhook URL whose path is not the provider's route", () => {
    expect(messages({ ...validBase, webhookUrl: "https://api.example.com/hooks/payment/stripe_stripe" })).toContain(
      "/hooks/payment/mollie_"
    )
    expect(messages({ ...validBase, webhookUrl: "https://api.example.com/" })).toContain("/hooks/payment/mollie_")
  })

  it("rejects a webhook URL that is not a URL", () => {
    expect(messages({ ...validBase, webhookUrl: "api.example.com/hooks/payment/mollie_mollie" })).toContain(
      "full webhook URL"
    )
  })

  it("accepts a valid https webhook URL", () => {
    expect(collectValidationIssues(descriptor, validBase)).toEqual([])
    expect(
      collectValidationIssues(descriptor, { ...validBase, webhookUrl: "https://shop.example/hooks/payment/mollie_eu" })
    ).toEqual([])
  })

  it("rejects an unknown capture mode and a description over 255 characters", () => {
    expect(issuePaths({ ...validBase, capture: "later" })).toContain("capture")
    expect(issuePaths({ ...validBase, paymentDescription: "x".repeat(255) })).toEqual([])
    expect(issuePaths({ ...validBase, paymentDescription: "x".repeat(256) })).toContain("paymentDescription")
  })

  it("keeps the API key out of the admin", () => {
    const options = descriptor.options as any
    expect(options.apiKey.secret).toBe(true)
    expect(options.webhookUrl.secret).toBeUndefined()
  })

  it("labels every capture mode", () => {
    const options = descriptor.options as any
    for (const value of options.capture.values) expect(options.capture.valueLabels[value]).toBeDefined()
  })

  it("lays out two sections with the capture settings in the side column", () => {
    expect(descriptor.sections.map((s) => s.id)).toEqual(["credentials", "behavior"])
    expect(descriptor.sections.find((s) => s.id === "behavior")).toMatchObject({
      column: "side",
      options: ["capture", "paymentDescription"],
    })
  })

  it("has an icon", () => {
    expect(descriptor.icon).toMatch(/^data:image\/svg\+xml,/)
  })
})

describe("Mollie integration testConnection", () => {
  beforeEach(() => {
    // the sandbox answers `live`, the profile's own mode, for a test key too
    getCurrent.mockReset().mockResolvedValue({ id: "pfl_abc123", mode: "live", name: "My Shop", status: "verified" })
    getMollie.mockReset().mockReturnValue({ profiles: { getCurrent } })
  })

  it("passes with a working key, naming the mode and the website profile", async () => {
    const result = await descriptor.testConnection!({ options: validBase })
    expect(result).toEqual({
      status: "passed",
      message: "Mode: test. Website profile: My Shop (pfl_abc123), verified",
    })
    expect(getMollie).toHaveBeenCalledWith(validBase.apiKey)
  })

  it("names the mode after the key, not after the profile", async () => {
    const result = await descriptor.testConnection!({ options: { ...validBase, apiKey: "live_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM" } })
    expect(result.message).toBe("Mode: live. Website profile: My Shop (pfl_abc123), verified")
  })

  it("fails with Mollie's message when it rejects the key", async () => {
    getCurrent.mockRejectedValue(
      new MollieApiError(
        MedusaError.Types.UNAUTHORIZED,
        "Mollie getCurrentProfile failed: Missing authentication, or failed to authenticate (401)",
        { status: 401, title: "Unauthorized Request" }
      )
    )
    const result = await descriptor.testConnection!({ options: validBase })
    expect(result.status).toBe("failed")
    expect(result.message).toContain("failed to authenticate")
  })

  it("fails without a key, without calling Mollie", async () => {
    expect(await descriptor.testConnection!({ options: { webhookUrl: validBase.webhookUrl } })).toEqual({
      status: "failed",
      message: "The API key is missing",
    })
    expect(getMollie).not.toHaveBeenCalled()
  })

  it("fails on a bad webhook URL, without calling Mollie", async () => {
    const result = await descriptor.testConnection!({
      options: { ...validBase, webhookUrl: "http://api.example.com/hooks/payment/mollie_mollie" },
    })
    expect(result).toMatchObject({ status: "failed" })
    expect(result.message).toContain("https only")
    expect(getMollie).not.toHaveBeenCalled()
  })
})

// Options validation moved off the payment provider's `validateOptions` and onto the
// integration descriptor. Structural rules (required credentials, enum membership, defaults)
// live in the composed `optionsSchema`; cross-field rules (receipt sub-options required when
// receipts are enabled) live in per-option `validate` and surface via full/activation
// validation (`collectValidationIssues`). These tests exercise both layers.
import TkassaIntegrationProvider from "../services/tkassa-integration"
import { collectValidationIssues } from "@gorgo/medusa-integration"

const descriptor = new TkassaIntegrationProvider().descriptor
const schema = descriptor.optionsSchema

const validBase = {
  terminalKey: "TestTerminalKey",
  password: "test_password",
}

const validReceipt = {
  ...validBase,
  useReceipt: true,
  ffdVersion: "1.05",
  taxation: "osn",
  taxItemDefault: "none",
  taxShippingDefault: "none",
}

// Structural (composed-schema) issue field names.
const issuePaths = (input: unknown): string[] => {
  const res = schema.safeParse(input)
  return res.success ? [] : res.error.issues.map((i) => String(i.path[0]))
}

// Full/activation validation issue paths (per-option `validate` + cross-section `validate`).
const validationPaths = (input: Record<string, unknown>): string[] =>
  collectValidationIssues(descriptor, input).map((i) => i.path)

describe("T-Kassa integration descriptor schema", () => {
  describe("required credentials (structural)", () => {
    it("rejects a missing terminalKey", () => {
      expect(issuePaths({ ...validBase, terminalKey: undefined })).toContain("terminalKey")
    })

    it("rejects an empty terminalKey", () => {
      expect(issuePaths({ ...validBase, terminalKey: "" })).toContain("terminalKey")
    })

    it("rejects a missing password", () => {
      expect(issuePaths({ ...validBase, password: undefined })).toContain("password")
    })

    it("accepts minimal valid options and applies defaults", () => {
      const res = schema.safeParse(validBase)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.capture).toBe(true)
        expect(res.data.useReceipt).toBe(false)
      }
    })
  })

  describe("receipt sub-options (required only when useReceipt is true)", () => {
    it("is complete without receipt fields when useReceipt is omitted (defaults false)", () => {
      expect(validationPaths(validBase)).toEqual([])
    })

    it("is complete without receipt fields when useReceipt is explicitly false", () => {
      expect(validationPaths({ ...validBase, useReceipt: false })).toEqual([])
    })

    it("is complete with fully-configured receipt options", () => {
      expect(validationPaths(validReceipt)).toEqual([])
    })

    // ffdVersion is excluded here: it has a descriptor `default` ("1.2"), so full validation
    // (which parses through the options schema before running `validate`) never sees it as
    // missing — unlike taxation/taxItemDefault/taxShippingDefault, which have no default.
    it.each<[string, string]>([
      ["taxation", "taxation"],
      ["taxItemDefault", "taxItemDefault"],
      ["taxShippingDefault", "taxShippingDefault"],
    ])("requires %s when useReceipt is true", (field, path) => {
      expect(validationPaths({ ...validReceipt, [field]: undefined })).toContain(path)
    })

    it.each<[string, Record<string, unknown>]>([
      ["taxation invalid", { ...validReceipt, taxation: "bogus" }],
      ["taxItemDefault invalid", { ...validReceipt, taxItemDefault: "vat999" }],
      ["taxShippingDefault invalid", { ...validReceipt, taxShippingDefault: "vat999" }],
      ["ffdVersion invalid", { ...validReceipt, ffdVersion: "2.0" }],
    ])("rejects when %s (structural enum)", (_name, input) => {
      expect(schema.safeParse(input).success).toBe(false)
    })
  })
})

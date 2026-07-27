import RobokassaIntegrationProvider from "../services/robokassa-integration"
import { collectValidationIssues } from "@gorgo/medusa-integration"

const descriptor = new RobokassaIntegrationProvider().descriptor
const schema = descriptor.optionsSchema

const validBase = {
  merchantLogin: "test-merchant",
  hashAlgorithm: "md5",
  password1: "test-password1",
  password2: "test-password2",
}

const validReceipt = {
  ...validBase,
  useReceipt: true,
  taxation: "osn",
  taxItemDefault: "none",
  taxShippingDefault: "none",
}

const validationPaths = (input: Record<string, unknown>): string[] =>
  collectValidationIssues(descriptor, input).map((i) => i.path)

describe("Robokassa integration descriptor schema", () => {
  describe("required credentials (structural)", () => {
    it("rejects a missing merchantLogin", () => {
      expect(schema.safeParse({ ...validBase, merchantLogin: undefined }).success).toBe(false)
    })

    it("rejects an empty merchantLogin", () => {
      expect(schema.safeParse({ ...validBase, merchantLogin: "" }).success).toBe(false)
    })

    it("rejects a missing password1", () => {
      expect(schema.safeParse({ ...validBase, password1: undefined }).success).toBe(false)
    })

    it("rejects a missing password2", () => {
      expect(schema.safeParse({ ...validBase, password2: undefined }).success).toBe(false)
    })

    it("rejects an invalid hashAlgorithm", () => {
      expect(schema.safeParse({ ...validBase, hashAlgorithm: "bogus" }).success).toBe(false)
    })

    it("accepts minimal valid options and applies defaults", () => {
      const res = schema.safeParse(validBase)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.capture).toBe(true)
        expect(res.data.isTest).toBe(false)
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

    it.each<[string, string]>([
      ["taxation", "taxation"],
      ["taxItemDefault", "taxItemDefault"],
      ["taxShippingDefault", "taxShippingDefault"],
    ])("requires %s when useReceipt is true", (field, path) => {
      expect(validationPaths({ ...validReceipt, [field]: undefined })).toContain(path)
    })

    it.each<[string, Record<string, unknown>]>([
      ["taxation invalid", { ...validReceipt, taxation: "bogus" }],
      ["taxItemDefault invalid", { ...validReceipt, taxItemDefault: "bogus" }],
      ["taxShippingDefault invalid", { ...validReceipt, taxShippingDefault: "bogus" }],
    ])("rejects when %s (structural enum)", (_name, input) => {
      expect(schema.safeParse(input).success).toBe(false)
    })
  })
})

import YookassaIntegrationProvider from "../services/yookassa-integration"
import { collectValidationIssues } from "@gorgo/medusa-integration"
import { vatCodes, taxSystemCodes } from "../../payment-yookassa/types"

const descriptor = new YookassaIntegrationProvider().descriptor
const schema = descriptor.optionsSchema
const option = (id: string) => (descriptor.options as any)[id]

const validBase = {
  shopId: "test-shop-id",
  secretKey: "test-secret-key",
}

const validReceipt = {
  ...validBase,
  useReceipt: true,
  taxItemDefault: 1,
  taxShippingDefault: 1,
}

const validReceiptWithAtol = {
  ...validReceipt,
  useAtolOnlineFFD120: true,
  taxSystemCode: 1,
}

const validationPaths = (input: Record<string, unknown>): string[] =>
  collectValidationIssues(descriptor, input).map((i) => i.path)

describe("YooKassa integration descriptor schema", () => {
  describe("required credentials (structural)", () => {
    it("rejects a missing shopId", () => {
      const res = schema.safeParse({ ...validBase, shopId: undefined })
      expect(res.success).toBe(false)
    })

    it("rejects an empty shopId", () => {
      const res = schema.safeParse({ ...validBase, shopId: "" })
      expect(res.success).toBe(false)
    })

    it("rejects a missing secretKey", () => {
      const res = schema.safeParse({ ...validBase, secretKey: undefined })
      expect(res.success).toBe(false)
    })

    it("accepts minimal valid options and applies defaults", () => {
      const res = schema.safeParse(validBase)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.capture).toBe(false)
        expect(res.data.useReceipt).toBe(false)
        expect(res.data.useAtolOnlineFFD120).toBe(false)
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
      ["taxItemDefault", "taxItemDefault"],
      ["taxShippingDefault", "taxShippingDefault"],
    ])("requires %s when useReceipt is true", (field, path) => {
      expect(validationPaths({ ...validReceipt, [field]: undefined })).toContain(path)
    })

    it.each<[string, unknown]>([
      ["taxItemDefault", 999],
      ["taxShippingDefault", 999],
    ])("rejects an invalid %s code", (field, value) => {
      expect(validationPaths({ ...validReceipt, [field]: value })).toContain(field)
    })
  })

  describe("Atol Online sub-option (required only when useAtolOnlineFFD120 is true)", () => {
    it("is complete without taxSystemCode when useAtolOnlineFFD120 is false", () => {
      expect(validationPaths(validReceipt)).toEqual([])
    })

    it("requires taxSystemCode when useAtolOnlineFFD120 is true", () => {
      expect(validationPaths({ ...validReceiptWithAtol, taxSystemCode: undefined })).toContain("taxSystemCode")
    })

    it("rejects an invalid taxSystemCode", () => {
      expect(validationPaths({ ...validReceiptWithAtol, taxSystemCode: 999 })).toContain("taxSystemCode")
    })

    it("is complete with a valid taxSystemCode", () => {
      expect(validationPaths(validReceiptWithAtol)).toEqual([])
    })
  })

  describe("tax codes as numeric enums", () => {
    it.each<[string, readonly number[]]>([
      ["taxSystemCode", taxSystemCodes],
      ["taxItemDefault", vatCodes],
      ["taxShippingDefault", vatCodes],
    ])("%s declares its codes as a select over numbers", (field, codes) => {
      expect(option(field).type).toBe("enum")
      expect(option(field).control).toBe("select")
      expect(option(field).values).toEqual(codes)
      expect(option(field).values.every((v: unknown) => typeof v === "number")).toBe(true)
    })

    it.each<[string, readonly number[]]>([
      ["taxSystemCode", taxSystemCodes],
      ["taxItemDefault", vatCodes],
      ["taxShippingDefault", vatCodes],
    ])("%s labels every code it declares", (field, codes) => {
      for (const code of codes) expect(option(field).valueLabels[code]).toBeDefined()
    })

    it("keeps every declared code numeric through the schema", () => {
      for (const code of vatCodes) {
        const res = schema.safeParse({ ...validReceipt, taxItemDefault: code })
        expect(res.success).toBe(true)
        if (res.success) expect(res.data.taxItemDefault).toBe(code)
      }
    })

    // The admin's `<Select>` submits the picked value as a string, and rows written while
    // these were plain number inputs may also hold one.
    it("coerces a code submitted as a string back to the number", () => {
      const res = schema.safeParse({
        ...validReceiptWithAtol,
        taxSystemCode: "3",
        taxItemDefault: "10",
      })
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.taxSystemCode).toBe(3)
        expect(res.data.taxItemDefault).toBe(10)
      }
    })

    it.each<[string, unknown]>([
      ["taxSystemCode", 7],
      ["taxSystemCode", "7"],
      ["taxItemDefault", 11],
      ["taxItemDefault", "11"],
    ])("rejects %s = %p, which is outside the declared set", (field, value) => {
      expect(schema.safeParse({ ...validReceiptWithAtol, [field]: value }).success).toBe(false)
    })

    it("treats a cleared select as unset rather than as a code", () => {
      const res = schema.safeParse({ ...validBase, useReceipt: false, taxItemDefault: "" })
      expect(res.success).toBe(true)
      if (res.success) expect(res.data.taxItemDefault).toBeUndefined()
    })
  })
})

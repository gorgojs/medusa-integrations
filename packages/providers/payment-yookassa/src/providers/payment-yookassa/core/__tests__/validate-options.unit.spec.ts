// Mock the telemetry side-effect of validateOptions so the static call
// doesn't try to dispatch an event over the network during unit tests.
jest.mock("@gorgo/telemetry", () => ({
  createTelemetryClient: () => ({ track: () => {} }),
}))

import YookassaService from "../../services/yookassa"

const validBase = {
  shopId: "test_shop_id",
  secretKey: "test_secret_key",
} as any

const validReceiptOptions = {
  ...validBase,
  useReceipt: true,
  taxItemDefault: 1,
  taxShippingDefault: 1,
} as any

const validReceiptOptionsFFD120 = {
  ...validReceiptOptions,
  useAtolOnlineFFD120: true,
  taxSystemCode: 1,
} as any

describe("YookassaBase.validateOptions", () => {
  describe("required credentials", () => {
    it("throws when shopId is missing", () => {
      expect(() =>
        (YookassaService as any).validateOptions({ ...validBase, shopId: undefined })
      ).toThrow(/shopId/)
    })

    it("throws when secretKey is missing", () => {
      expect(() =>
        (YookassaService as any).validateOptions({ ...validBase, secretKey: undefined })
      ).toThrow(/secretKey/)
    })

    it("accepts valid minimal options (no receipt config)", () => {
      expect(() => (YookassaService as any).validateOptions(validBase)).not.toThrow()
    })
  })

  describe("receipt sub-options (only validated when useReceipt is defined)", () => {
    it("skips receipt validation when useReceipt is undefined", () => {
      expect(() => (YookassaService as any).validateOptions(validBase)).not.toThrow()
    })

    it("accepts fully-configured receipt options without FFD 1.2", () => {
      expect(() => (YookassaService as any).validateOptions(validReceiptOptions)).not.toThrow()
    })

    it("accepts fully-configured receipt options with FFD 1.2 (Atol Online)", () => {
      expect(() => (YookassaService as any).validateOptions(validReceiptOptionsFFD120)).not.toThrow()
    })

    it("throws when taxItemDefault is missing while useReceipt is defined", () => {
      expect(() =>
        (YookassaService as any).validateOptions({ ...validReceiptOptions, taxItemDefault: undefined })
      ).toThrow()
    })

    it("throws when taxShippingDefault is missing while useReceipt is defined", () => {
      expect(() =>
        (YookassaService as any).validateOptions({ ...validReceiptOptions, taxShippingDefault: undefined })
      ).toThrow()
    })

    it("throws when taxSystemCode is missing with useAtolOnlineFFD120=true", () => {
      expect(() =>
        (YookassaService as any).validateOptions({
          ...validReceiptOptions,
          useAtolOnlineFFD120: true,
          taxSystemCode: undefined,
        })
      ).toThrow(/taxSystemCode/)
    })

    it.each<[string, any]>([
      ["taxItemDefault invalid", { ...validReceiptOptions, taxItemDefault: 99 }],
      ["taxShippingDefault invalid", { ...validReceiptOptions, taxShippingDefault: 99 }],
    ])("throws when %s", (_name, options) => {
      expect(() => (YookassaService as any).validateOptions(options)).toThrow(/Invalid option/)
    })

    it("throws when taxSystemCode is invalid with useAtolOnlineFFD120=true", () => {
      expect(() =>
        (YookassaService as any).validateOptions({
          ...validReceiptOptionsFFD120,
          taxSystemCode: 99,
        })
      ).toThrow(/Invalid option/)
    })

    it("validates useReceipt=false the same way as useReceipt=true (sub-options required)", () => {
      // useReceipt is `isDefined`-checked, so `false` still triggers full sub-option validation.
      expect(() =>
        (YookassaService as any).validateOptions({ ...validBase, useReceipt: false })
      ).toThrow()
    })
  })
})

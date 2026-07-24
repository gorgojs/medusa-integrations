// Mock the telemetry side-effect of validateOptions so the static call
// doesn't try to dispatch an event over the network during unit tests.
jest.mock("@gorgo/telemetry", () => ({
  createTelemetryClient: () => ({ track: () => {} }),
}))

import TkassaService from "../../services/tkassa"

const validBase = {
  terminalKey: "TestTerminalKey",
  password: "test_password",
} as any

const validReceiptOptions = {
  ...validBase,
  useReceipt: true,
  ffdVersion: "1.05",
  taxation: "osn",
  taxItemDefault: "none",
  taxShippingDefault: "none",
} as any

describe("TkassaBase.validateOptions", () => {
  describe("required credentials", () => {
    it("throws when terminalKey is missing", () => {
      expect(() => (TkassaService as any).validateOptions({ ...validBase, terminalKey: undefined })).toThrow(
        /terminalKey/
      )
    })

    it("throws when password is missing", () => {
      expect(() => (TkassaService as any).validateOptions({ ...validBase, password: undefined })).toThrow(
        /password/
      )
    })

    it("accepts valid minimal options (no receipt config)", () => {
      expect(() => (TkassaService as any).validateOptions(validBase)).not.toThrow()
    })
  })

  describe("receipt sub-options (only validated when useReceipt is defined)", () => {
    it("skips receipt validation when useReceipt is undefined", () => {
      // No ffdVersion/taxation/taxItem/taxShipping required when useReceipt is absent.
      expect(() => (TkassaService as any).validateOptions({ ...validBase })).not.toThrow()
    })

    it("accepts fully-configured receipt options", () => {
      expect(() => (TkassaService as any).validateOptions(validReceiptOptions)).not.toThrow()
    })

    it.each<[string, any]>([
      ["taxation missing", { ...validReceiptOptions, taxation: undefined }],
      ["taxItemDefault missing", { ...validReceiptOptions, taxItemDefault: undefined }],
      ["taxShippingDefault missing", { ...validReceiptOptions, taxShippingDefault: undefined }],
      ["ffdVersion missing", { ...validReceiptOptions, ffdVersion: undefined }],
    ])("throws when %s while useReceipt is defined", (_name, options) => {
      expect(() => (TkassaService as any).validateOptions(options)).toThrow()
    })

    it.each<[string, any]>([
      ["taxation invalid", { ...validReceiptOptions, taxation: "bogus" }],
      ["taxItemDefault invalid", { ...validReceiptOptions, taxItemDefault: "vat999" }],
      ["taxShippingDefault invalid", { ...validReceiptOptions, taxShippingDefault: "vat999" }],
      ["ffdVersion invalid", { ...validReceiptOptions, ffdVersion: "2.0" }],
    ])("throws when %s", (_name, options) => {
      expect(() => (TkassaService as any).validateOptions(options)).toThrow(/Invalid option/)
    })

    it("validates useReceipt=false the same way as useReceipt=true (sub-options required)", () => {
      // useReceipt is `isDefined`-checked, so `false` still triggers full sub-option validation.
      expect(() =>
        (TkassaService as any).validateOptions({ ...validBase, useReceipt: false })
      ).toThrow()
    })
  })
})

// Suppress the telemetry network call that validateOptions fires.
jest.mock("@gorgo/telemetry", () => ({
  createTelemetryClient: () => ({ track: () => {} }),
}))

import RobokassaService from "../../services/robokassa"

const validBase = {
  merchantLogin: "test_login",
  hashAlgorithm: "md5",
  password1: "test_password1",
  password2: "test_password2",
} as any

const validReceiptOptions = {
  ...validBase,
  useReceipt: true,
  taxation: "osn",
  taxItemDefault: "none",
  taxShippingDefault: "none",
} as any

describe("RobokassaBase.validateOptions", () => {
  describe("required credentials", () => {
    it("throws when merchantLogin is missing", () => {
      expect(() =>
        (RobokassaService as any).validateOptions({ ...validBase, merchantLogin: undefined })
      ).toThrow(/merchantLogin/)
    })

    it("throws when password1 is missing", () => {
      expect(() =>
        (RobokassaService as any).validateOptions({ ...validBase, password1: undefined })
      ).toThrow(/password1/)
    })

    it("throws when password2 is missing", () => {
      expect(() =>
        (RobokassaService as any).validateOptions({ ...validBase, password2: undefined })
      ).toThrow(/password2/)
    })

    it("throws when hashAlgorithm is missing", () => {
      expect(() =>
        (RobokassaService as any).validateOptions({ ...validBase, hashAlgorithm: undefined })
      ).toThrow(/hashAlgorithm/)
    })

    it("throws when hashAlgorithm is not in the allowed list", () => {
      expect(() =>
        (RobokassaService as any).validateOptions({ ...validBase, hashAlgorithm: "blake2" })
      ).toThrow(/hashAlgorithm/)
    })

    it("accepts valid minimal options (no receipt config)", () => {
      expect(() => (RobokassaService as any).validateOptions(validBase)).not.toThrow()
    })

    it.each(["md5", "sha1", "sha256", "sha512"] as const)(
      "accepts hashAlgorithm=%s",
      (algo) => {
        expect(() =>
          (RobokassaService as any).validateOptions({ ...validBase, hashAlgorithm: algo })
        ).not.toThrow()
      }
    )
  })

  describe("receipt sub-options (only validated when useReceipt === true)", () => {
    it("skips receipt validation when useReceipt is undefined", () => {
      expect(() => (RobokassaService as any).validateOptions({ ...validBase })).not.toThrow()
    })

    // Key difference from T-Kassa: robokassa uses `== true`, so useReceipt=false does NOT trigger validation.
    it("skips receipt validation when useReceipt is false", () => {
      expect(() =>
        (RobokassaService as any).validateOptions({ ...validBase, useReceipt: false })
      ).not.toThrow()
    })

    it("accepts fully-configured receipt options", () => {
      expect(() => (RobokassaService as any).validateOptions(validReceiptOptions)).not.toThrow()
    })

    it.each<[string, any]>([
      ["taxation missing", { ...validReceiptOptions, taxation: undefined }],
      ["taxItemDefault missing", { ...validReceiptOptions, taxItemDefault: undefined }],
      ["taxShippingDefault missing", { ...validReceiptOptions, taxShippingDefault: undefined }],
    ])("throws when %s while useReceipt is true", (_name, options) => {
      expect(() => (RobokassaService as any).validateOptions(options)).toThrow()
    })

    it.each<[string, any]>([
      ["taxation invalid", { ...validReceiptOptions, taxation: "bogus" }],
      ["taxItemDefault invalid", { ...validReceiptOptions, taxItemDefault: "vat999" }],
      ["taxShippingDefault invalid", { ...validReceiptOptions, taxShippingDefault: "vat999" }],
    ])("throws with Invalid option when %s", (_name, options) => {
      expect(() => (RobokassaService as any).validateOptions(options)).toThrow(/Invalid option/)
    })
  })
})

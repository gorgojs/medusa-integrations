import { createHash } from "node:crypto"
import { createSignature } from "../create-signature"

describe("createSignature", () => {
  describe("basic hashing", () => {
    it("joins non-empty values with ':' and hashes with md5", () => {
      const raw = ["test_login", "15.00", "12345", "test_password1"]
      const expected = createHash("md5").update("test_login:15.00:12345:test_password1").digest("hex")
      expect(createSignature(raw, "md5")).toBe(expected)
    })

    it("joins non-empty values with ':' and hashes with sha256", () => {
      const raw = ["test_login", "15.00", "12345", "test_password1"]
      const expected = createHash("sha256").update("test_login:15.00:12345:test_password1").digest("hex")
      expect(createSignature(raw, "sha256")).toBe(expected)
    })

    it("result is a lowercase hex string", () => {
      const result = createSignature(["a", "b"], "md5")
      expect(result).toMatch(/^[a-f0-9]+$/)
    })
  })

  describe("undefined / falsy filtering", () => {
    it("filters out undefined values before joining", () => {
      // Equivalent to createSignature(["a", "c"], "md5")
      const withUndefined = createSignature(["a", undefined, "c"], "md5")
      const withoutUndefined = createSignature(["a", "c"], "md5")
      expect(withUndefined).toBe(withoutUndefined)
    })

    it("filters out empty strings", () => {
      const withEmpty = createSignature(["a", "", "c"], "md5")
      const withoutEmpty = createSignature(["a", "c"], "md5")
      expect(withEmpty).toBe(withoutEmpty)
    })

    it("handles an all-undefined array (hash of empty string)", () => {
      const result = createSignature([undefined, undefined], "md5")
      const expected = createHash("md5").update("").digest("hex")
      expect(result).toBe(expected)
    })
  })

  describe("Shp_SessionID parameter (webhook / initiate signature)", () => {
    it("includes Shp_SessionID as last segment", () => {
      const raw = ["15.00", "12345", "test_password2", "Shp_SessionID=cart_01HX"]
      const expected = createHash("md5")
        .update("15.00:12345:test_password2:Shp_SessionID=cart_01HX")
        .digest("hex")
      expect(createSignature(raw, "md5")).toBe(expected)
    })
  })

  it.each(["md5", "sha1", "sha256", "sha384", "sha512"] as const)(
    "accepts algorithm %s without throwing",
    (algo) => {
      expect(() => createSignature(["a", "b"], algo)).not.toThrow()
    }
  )
})

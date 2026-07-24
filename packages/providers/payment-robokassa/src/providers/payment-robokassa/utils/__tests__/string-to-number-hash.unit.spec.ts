import { stringToNumberHash } from "../string-to-number-hash"

describe("stringToNumberHash", () => {
  it("returns a non-negative integer", () => {
    const result = stringToNumberHash("hello")
    expect(Number.isInteger(result)).toBe(true)
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it("returns 0 for an empty string", () => {
    expect(stringToNumberHash("")).toBe(0)
  })

  it("is deterministic — same input always returns the same value", () => {
    expect(stringToNumberHash("idem-1")).toBe(stringToNumberHash("idem-1"))
  })

  it("returns different values for different inputs", () => {
    expect(stringToNumberHash("idem-1")).not.toBe(stringToNumberHash("idem-2"))
  })

  it("always returns a positive number (Math.abs applied)", () => {
    // Test many strings to exercise the sign-flip branch
    const inputs = ["a", "b", "abc", "cart_01HX", "some-long-idempotency-key-value-0123456789"]
    for (const s of inputs) {
      expect(stringToNumberHash(s)).toBeGreaterThanOrEqual(0)
    }
  })

  it("result fits in a 32-bit signed integer range (hash |= 0)", () => {
    const result = stringToNumberHash("test-idempotency-key-12345")
    expect(result).toBeLessThanOrEqual(2147483647)
  })

  it("returns a numeric string when converted — suitable as InvoiceID", () => {
    const result = stringToNumberHash("idem-1").toString()
    expect(result).toMatch(/^\d+$/)
  })
})

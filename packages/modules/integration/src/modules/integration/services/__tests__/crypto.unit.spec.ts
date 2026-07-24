import { describe, expect, it } from "@jest/globals"
import { deriveKey, encryptValue, decryptValue } from "../crypto"

const key = deriveKey("any-non-empty-passphrase")

describe("crypto", () => {
  it("deriveKey returns a 32-byte key for any non-empty passphrase", () => {
    expect(deriveKey("x").length).toBe(32)
    expect(deriveKey("a much longer passphrase 12345").length).toBe(32)
  })

  it("round-trips a string value", () => {
    const blob = encryptValue("s3cr3t", key)
    expect(typeof blob).toBe("string")
    expect(decryptValue(blob, key)).toBe("s3cr3t")
  })

  it("round-trips a non-string JSON value", () => {
    const blob = encryptValue({ a: 1, b: ["x"] }, key)
    expect(decryptValue(blob, key)).toEqual({ a: 1, b: ["x"] })
  })

  it("fails to decrypt with a wrong key", () => {
    const blob = encryptValue("secret", key)
    expect(() => decryptValue(blob, deriveKey("different"))).toThrow()
  })

  it("fails to decrypt tampered ciphertext (GCM auth tag)", () => {
    const raw = Buffer.from(encryptValue("secret", key), "base64")
    raw[raw.length - 1] ^= 0x01 // flip a bit in the ciphertext
    expect(() => decryptValue(raw.toString("base64"), key)).toThrow()
  })

  it("produces a different blob each call (fresh iv)", () => {
    expect(encryptValue("x", key)).not.toEqual(encryptValue("x", key))
  })
})

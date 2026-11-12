import { describe, expect, it } from "@jest/globals"
import crypto from "crypto"
import { deriveKey, encryptValue, decryptValue, isEncryptedValue } from "../crypto"

const key = deriveKey("any-non-empty-passphrase")
const IV_PLUS_TAG = 12 + 16

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
    const raw = Buffer.from(encryptValue("secret", key).slice("v1:".length), "base64")
    raw[raw.length - 1] ^= 0x01 // flip a bit in the ciphertext
    expect(() => decryptValue(`v1:${raw.toString("base64")}`, key)).toThrow()
  })

  it("writes the versioned format", () => {
    expect(encryptValue("secret", key)).toMatch(/^v1:[A-Za-z0-9+/]+=*$/)
  })

  it("reads a value 0.x wrote, which has no version prefix", () => {
    // The 0.x format: base64 of iv ‖ tag ‖ ciphertext, built here the way 0.3.3 built it.
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
    const plaintext = JSON.stringify("legacy-secret")
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
    const legacy = Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64")

    expect(legacy).not.toContain(":")
    expect(decryptValue(legacy, key)).toBe("legacy-secret")
  })

  it("refuses a format version it doesn't know, naming it", () => {
    const payload = encryptValue("secret", key).slice("v1:".length)
    expect(() => decryptValue(`v2:${payload}`, key)).toThrow(/format v2/)
  })

  it("recognizes an encrypted value, versioned or from 0.x, and not plain text", () => {
    const v1 = encryptValue("", key)
    expect(isEncryptedValue(v1)).toBe(true)
    expect(isEncryptedValue(v1.slice("v1:".length))).toBe(true) // the 0.x shape
    expect(isEncryptedValue("v2:anything")).toBe(true) // an unknown version is still refused on decrypt
    expect(isEncryptedValue("sk_test_51H8abc")).toBe(false)
    expect(isEncryptedValue("short")).toBe(false)
    expect(isEncryptedValue(Buffer.alloc(IV_PLUS_TAG).toString("base64"))).toBe(false) // too short for a payload
  })

  it("produces a different blob each call (fresh iv)", () => {
    expect(encryptValue("x", key)).not.toEqual(encryptValue("x", key))
  })
})

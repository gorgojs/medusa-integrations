import { describe, expect, it, jest } from "@jest/globals"
import { MedusaError } from "@medusajs/framework/utils"
import { deriveKey, encryptValue } from "../crypto"
import { encryptSecretsInline, decryptSecretsInline, decryptPlainOptions } from "../secrets"

const key = deriveKey("test-passphrase")
const getKey = () => key
const decrypt = (options: Record<string, unknown>, secretKeys: string[], k: () => Buffer = getKey) =>
  decryptSecretsInline(options, secretKeys, k, "int_demo_default")

describe("inline secrets", () => {
  it("encrypts only secret keys, leaves others as-is", () => {
    const out = encryptSecretsInline({ login: "u", password: "p" }, ["password"], key)
    expect(out.login).toBe("u")
    expect(typeof out.password).toBe("string")
    expect(out.password).not.toBe("p")
  })

  it("round-trips through decrypt", () => {
    const enc = encryptSecretsInline({ login: "u", password: "p" }, ["password"], key)
    expect(decrypt(enc, ["password"])).toEqual({ login: "u", password: "p" })
  })

  it("leaves non-secret values untouched on decrypt", () => {
    expect(decrypt({ login: "u", note: "plain" }, ["password"])).toEqual({ login: "u", note: "plain" })
  })

  it("does not encrypt empty/absent secret values", () => {
    expect(encryptSecretsInline({ password: "" }, ["password"], key).password).toBe("")
  })

  it("round-trips a non-string secret value", () => {
    const enc = encryptSecretsInline({ cfg: { k: 1 } }, ["cfg"], key)
    expect(typeof enc.cfg).toBe("string")
    expect(decrypt(enc, ["cfg"])).toEqual({ cfg: { k: 1 } })
  })

  it("asks for the key only when a value has to be decrypted", () => {
    const noKey = jest.fn((): Buffer => {
      throw new Error("no key")
    })
    expect(decrypt({ login: "u", password: "" }, ["password"], noKey)).toEqual({ login: "u", password: "" })
    expect(noKey).not.toHaveBeenCalled()
  })
})

describe("a secret flag that changed after the values were saved", () => {
  it("returns a secret option's plain text, saved before the option became secret, as is", () => {
    expect(decrypt({ password: "saved-in-clear" }, ["password"])).toEqual({ password: "saved-in-clear" })
  })

  it("decrypts a plain option's value, saved while the option was secret", () => {
    expect(decrypt({ login: encryptValue("u", key) }, [])).toEqual({ login: "u" })
  })

  it("keeps a plain option's value that only looks encrypted", () => {
    const lookalike = Buffer.alloc(32, 7).toString("base64")
    expect(decrypt({ note: lookalike }, [])).toEqual({ note: lookalike })
  })
})

describe("a secret that doesn't decrypt", () => {
  const stored = { password: encryptValue("p", key) }

  it("throws a MedusaError naming the option and the integration when the key changed", () => {
    let error: any
    try {
      decrypt(stored, ["password"], () => deriveKey("another-passphrase"))
    } catch (e) {
      error = e
    }
    expect(MedusaError.isMedusaError(error)).toBe(true)
    expect(error.type).toBe(MedusaError.Types.UNEXPECTED_STATE)
    expect(error.message).toMatch(/"password" of the integration "int_demo_default"/)
    expect(error.message).toMatch(/encryptionKey/)
  })

  it("names the format version it doesn't know", () => {
    const v2 = { password: `v2:${encryptValue("p", key).slice("v1:".length)}` }
    expect(() => decrypt(v2, ["password"])).toThrow(/format v2/)
  })
})

describe("decryptPlainOptions", () => {
  it("decrypts a plain option saved while it was secret and leaves the secret options as stored", () => {
    const secret = encryptValue("p", key)
    expect(decryptPlainOptions({ login: encryptValue("u", key), password: secret }, ["password"], getKey)).toEqual({
      login: "u",
      password: secret,
    })
  })

  it("keeps the stored value when it doesn't decrypt or there is no key", () => {
    const login = encryptValue("u", key)
    const noKey = (): Buffer => {
      throw new Error("no key")
    }
    expect(decryptPlainOptions({ login }, [], () => deriveKey("another-passphrase"))).toEqual({ login })
    expect(decryptPlainOptions({ login }, [], noKey)).toEqual({ login })
  })
})

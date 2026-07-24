import { describe, expect, it } from "@jest/globals"
import { deriveKey } from "../crypto"
import { encryptSecretsInline, decryptSecretsInline } from "../secrets"

const key = deriveKey("test-passphrase")

describe("inline secrets", () => {
  it("encrypts only secret keys, leaves others as-is", () => {
    const out = encryptSecretsInline({ login: "u", password: "p" }, ["password"], key)
    expect(out.login).toBe("u")
    expect(typeof out.password).toBe("string")
    expect(out.password).not.toBe("p")
  })

  it("round-trips through decrypt", () => {
    const enc = encryptSecretsInline({ login: "u", password: "p" }, ["password"], key)
    expect(decryptSecretsInline(enc, ["password"], key)).toEqual({ login: "u", password: "p" })
  })

  it("leaves non-secret values untouched on decrypt", () => {
    expect(decryptSecretsInline({ login: "u", note: "plain" }, ["password"], key)).toEqual({
      login: "u",
      note: "plain",
    })
  })

  it("does not encrypt empty/absent secret values", () => {
    expect(encryptSecretsInline({ password: "" }, ["password"], key).password).toBe("")
  })

  it("round-trips a non-string secret value", () => {
    const enc = encryptSecretsInline({ cfg: { k: 1 } }, ["cfg"], key)
    expect(typeof enc.cfg).toBe("string")
    expect(decryptSecretsInline(enc, ["cfg"], key)).toEqual({ cfg: { k: 1 } })
  })
})

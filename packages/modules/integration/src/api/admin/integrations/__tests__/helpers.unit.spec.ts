import { describe, expect, it } from "@jest/globals"
import { maskedView, maskSecretValues, withProviderId } from "../_helpers"

const rec = (options: Record<string, unknown>) => ({
  id: "int_x",
  provider_id: "int_x",
  category: "payment",
  title: null,
  is_enabled: true,
  last_test_status: null,
  options,
})

describe("maskedView", () => {
  it("reports configured secrets per field — only those with a stored value", () => {
    // apiKey has ciphertext, clientSecret is blank → only apiKey counts as configured.
    const v = maskedView(rec({ apiKey: "ct", clientSecret: "", terminalKey: "abc" }), ["apiKey", "clientSecret"])
    expect(v.configured_secrets).toEqual(["apiKey"])
  })

  it("returns an empty list when no secret is set", () => {
    const v = maskedView(rec({ terminalKey: "abc" }), ["apiKey", "clientSecret"])
    expect(v.configured_secrets).toEqual([])
  })

  it("never leaks secret ciphertext into values", () => {
    const v = maskedView(rec({ apiKey: "ct", terminalKey: "abc" }), ["apiKey"])
    expect(v.values).toEqual({ terminalKey: "abc" })
    expect(Object.prototype.hasOwnProperty.call(v.values, "apiKey")).toBe(false)
  })

  it("returns the metadata as stored, and null for a record without it", () => {
    expect(maskedView({ ...rec({}), metadata: { erp_id: "42" } }, []).metadata).toEqual({ erp_id: "42" })
    expect(maskedView(rec({}), []).metadata).toBeNull()
  })
})

describe("maskSecretValues", () => {
  const descriptor = {
    identifier: "test",
    options: { apiKey: { secret: false }, secretKey: { secret: true } },
  } as any

  const change = (diff: unknown[]) => ({ id: "intch_1", provider_id: "int_test", diff })

  it("hides the values of a field that is secret now, keeping its label", () => {
    const out = maskSecretValues(
      change([
        { field: "secretKey", label: "test.secretKey", from: "old-plain", to: "new-plain" },
        { field: "apiKey", label: "test.apiKey", from: "a", to: "b" },
      ]),
      descriptor
    )
    expect(out.diff).toEqual([
      { field: "secretKey", label: "test.secretKey", secret: true, op: "hidden" },
      { field: "apiKey", label: "test.apiKey", from: "a", to: "b" },
    ])
    expect(JSON.stringify(out)).not.toContain("old-plain")
  })

  it("omits the label when the entry has none", () => {
    const out = maskSecretValues(change([{ field: "secretKey", from: null, to: "x" }]), descriptor)
    expect(out.diff).toEqual([{ field: "secretKey", secret: true, op: "hidden" }])
  })

  it("leaves secret entries as they are", () => {
    const diff = [{ field: "secretKey", label: "test.secretKey", secret: true, op: "replaced" }]
    expect(maskSecretValues(change(diff), descriptor).diff).toEqual(diff)
  })

  it("returns the change unchanged when the provider is not registered", () => {
    const c = change([{ field: "secretKey", from: "a", to: "b" }])
    expect(maskSecretValues(c, undefined)).toBe(c)
  })

  it("does not mutate its input", () => {
    const c = change([{ field: "secretKey", from: "a", to: "b" }])
    maskSecretValues(c, descriptor)
    expect(c.diff).toEqual([{ field: "secretKey", from: "a", to: "b" }])
  })
})

describe("withProviderId", () => {
  it("adds provider_id to a narrowed field list", () => {
    expect(withProviderId(["diff"])).toEqual(["diff", "provider_id"])
  })

  it("leaves a list that already has it, or all fields, alone", () => {
    expect(withProviderId(["provider_id", "diff"])).toEqual(["provider_id", "diff"])
    expect(withProviderId(["*"])).toEqual(["*"])
    expect(withProviderId(undefined)).toEqual(["*"])
  })
})

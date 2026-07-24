import { describe, expect, it } from "@jest/globals"
import { maskedView } from "../_helpers"

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
})

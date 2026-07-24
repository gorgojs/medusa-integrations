import { describe, expect, it } from "@jest/globals"
import { optionToZod } from "../build-zod"

describe("optionToZod", () => {
  it("string required rejects undefined and empty (minLength 1)", () => {
    const s = optionToZod({ type: "string", required: true, minLength: 1, label: "l" })
    expect(s.safeParse(undefined).success).toBe(false)
    expect(s.safeParse("").success).toBe(false)
    expect(s.safeParse("x").success).toBe(true)
  })

  it("optional string accepts undefined", () => {
    expect(optionToZod({ type: "string", label: "l" }).safeParse(undefined).success).toBe(true)
  })

  it("url type validates URLs", () => {
    const u = optionToZod({ type: "url", label: "l" })
    expect(u.safeParse("nope").success).toBe(false)
    expect(u.safeParse("https://x.io").success).toBe(true)
    expect(u.safeParse("http://x.io").success).toBe(true)
  })

  it("url type restricts the scheme via protocols", () => {
    const https = optionToZod({ type: "url", protocols: ["https"], label: "l" })
    expect(https.safeParse("https://x.io").success).toBe(true)
    expect(https.safeParse("http://x.io").success).toBe(false)
  })

  it("email type validates emails", () => {
    const e = optionToZod({ type: "email", label: "l" })
    expect(e.safeParse("a@b.co").success).toBe(true)
    expect(e.safeParse("a@b").success).toBe(false)
  })

  it("uuid type validates UUIDs", () => {
    const u = optionToZod({ type: "uuid", label: "l" })
    expect(u.safeParse("not-a-uuid").success).toBe(false)
    expect(u.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true)
  })

  it("boolean with default fills undefined", () => {
    const r = optionToZod({ type: "boolean", default: true, label: "l" }).safeParse(undefined)
    expect(r.success && r.data).toBe(true)
  })

  it("enum rejects out-of-set values", () => {
    const s = optionToZod({ type: "enum", values: ["a", "b"], label: "l" })
    expect(s.safeParse("a").success).toBe(true)
    expect(s.safeParse("c").success).toBe(false)
  })

  it("number honors int/min/max/positive/nonnegative/multipleOf", () => {
    expect(optionToZod({ type: "number", int: true, label: "l" }).safeParse(2.5).success).toBe(false)
    expect(optionToZod({ type: "number", min: 1, max: 10, label: "l" }).safeParse(0).success).toBe(false)
    expect(optionToZod({ type: "number", positive: true, label: "l" }).safeParse(0).success).toBe(false)
    expect(optionToZod({ type: "number", nonnegative: true, label: "l" }).safeParse(-1).success).toBe(false)
    expect(optionToZod({ type: "number", nonnegative: true, label: "l" }).safeParse(0).success).toBe(true)
    expect(optionToZod({ type: "number", multipleOf: 5, label: "l" }).safeParse(7).success).toBe(false)
    expect(optionToZod({ type: "number", multipleOf: 5, label: "l" }).safeParse(10).success).toBe(true)
  })

  it("json accepts arbitrary values; required rejects undefined; default fills", () => {
    const opt = optionToZod({ type: "json", label: "l" })
    expect(opt.safeParse({ a: 1 }).success).toBe(true)
    expect(opt.safeParse([1, 2]).success).toBe(true)
    expect(opt.safeParse(undefined).success).toBe(true) // optional
    expect(optionToZod({ type: "json", required: true, label: "l" }).safeParse(undefined).success).toBe(false)
    const d = optionToZod({ type: "json", default: [], label: "l" }).safeParse(undefined)
    expect(d.success && d.data).toEqual([])
  })

  // The admin form uses "" as its empty sentinel; the schema must read "" as "not provided"
  // for non-string types where "" is never a valid value (enum/number/url/email/uuid/boolean),
  // so a blank optional field validates instead of erroring.
  it("treats an empty-string blank as absent for optional non-string types", () => {
    expect(optionToZod({ type: "enum", values: ["a", "b"], label: "l" }).safeParse("").success).toBe(true)
    expect(optionToZod({ type: "number", label: "l" }).safeParse("").success).toBe(true)
    expect(optionToZod({ type: "url", label: "l" }).safeParse("").success).toBe(true)
    expect(optionToZod({ type: "email", label: "l" }).safeParse("").success).toBe(true)
    expect(optionToZod({ type: "uuid", label: "l" }).safeParse("").success).toBe(true)
  })

  it("applies the default when a non-string field is blank ('')", () => {
    const e = optionToZod({ type: "enum", values: ["a", "b"], default: "a", label: "l" }).safeParse("")
    expect(e.success && e.data).toBe("a")
    const n = optionToZod({ type: "number", default: 7, label: "l" }).safeParse("")
    expect(n.success && n.data).toBe(7)
  })

  it("required non-string types still reject a blank ('')", () => {
    expect(optionToZod({ type: "enum", values: ["a", "b"], required: true, label: "l" }).safeParse("").success).toBe(false)
    expect(optionToZod({ type: "number", required: true, label: "l" }).safeParse("").success).toBe(false)
  })

  it("does not coerce '' for string type (empty string stays a string value)", () => {
    // Strings enforce non-empty via minLength, not via the ""→absent coercion.
    const r = optionToZod({ type: "string", label: "l" }).safeParse("")
    expect(r.success && r.data).toBe("")
  })

  // `null` is the admin's explicit "clear" for a blanked number/JSON field (survives
  // JSON.stringify, unlike `undefined`) — the schema reads it as "absent".
  it("treats null as absent for non-string types (explicit clear)", () => {
    expect(optionToZod({ type: "number", label: "l" }).safeParse(null).success).toBe(true)
    const e = optionToZod({ type: "enum", values: ["a", "b"], label: "l" }).safeParse(null)
    expect(e.success && e.data).toBeUndefined()
  })

  it("re-applies the default when a non-string field is cleared with null", () => {
    const n = optionToZod({ type: "number", default: 7, label: "l" }).safeParse(null)
    expect(n.success && n.data).toBe(7)
    const j = optionToZod({ type: "json", default: [], label: "l" }).safeParse(null)
    expect(j.success && j.data).toEqual([])
  })

  it("required non-string types still reject a null clear", () => {
    expect(optionToZod({ type: "number", required: true, label: "l" }).safeParse(null).success).toBe(false)
    expect(optionToZod({ type: "enum", values: ["a", "b"], required: true, label: "l" }).safeParse(null).success).toBe(false)
  })
})

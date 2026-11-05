import { describe, expect, it } from "@jest/globals"
import { defineIntegration } from "../define"
import { diffFields, diffOptions, DIFF_MAX_BYTES, DIFF_MAX_FIELDS, DIFF_MAX_VALUE_LENGTH } from "../diff"

const descriptor = defineIntegration({
  category: "payment",
  displayName: "demo.name",
  options: {
    shopId: { type: "string", label: "demo.shopId" },
    secretKey: { type: "string", secret: true, label: "demo.secretKey" },
    capture: { type: "boolean", default: true, label: "demo.capture" },
    webhooks: { type: "json", default: [], label: "demo.webhooks" },
  },
  sections: [{ id: "main", title: "demo.main", options: ["shopId", "secretKey", "capture", "webhooks"] }],
})

const SECRET = "live_sk_0123456789abcdef"

describe("diffOptions", () => {
  it("returns nothing when the values are the same", () => {
    const values = { shopId: "123", secretKey: SECRET, capture: true }
    expect(diffOptions(descriptor, values, { ...values })).toEqual([])
  })

  it("lists only the option that changed, with its label", () => {
    const before = { shopId: "123", secretKey: SECRET, capture: true }
    const after = { ...before, shopId: "654" }
    expect(diffOptions(descriptor, before, after)).toEqual([
      { field: "shopId", label: "demo.shopId", from: "123", to: "654" },
    ])
  })

  it("treats a missing value as null on both sides", () => {
    expect(diffOptions(descriptor, {}, { shopId: "1" })).toEqual([
      { field: "shopId", label: "demo.shopId", from: null, to: "1" },
    ])
    expect(diffOptions(descriptor, { shopId: "1" }, {})).toEqual([
      { field: "shopId", label: "demo.shopId", from: "1", to: null },
    ])
  })

  it("records a secret as set, replaced or removed and never keeps its value", () => {
    const set = diffOptions(descriptor, {}, { secretKey: SECRET })
    const replaced = diffOptions(descriptor, { secretKey: "old" }, { secretKey: SECRET })
    const removed = diffOptions(descriptor, { secretKey: SECRET }, {})
    expect(set).toEqual([{ field: "secretKey", label: "demo.secretKey", secret: true, op: "set" }])
    expect(replaced).toEqual([{ field: "secretKey", label: "demo.secretKey", secret: true, op: "replaced" }])
    expect(removed).toEqual([{ field: "secretKey", label: "demo.secretKey", secret: true, op: "removed" }])
    for (const entries of [set, replaced, removed]) {
      expect(JSON.stringify(entries)).not.toContain(SECRET)
      expect(JSON.stringify(entries)).not.toContain("old")
    }
  })

  it("skips a secret saved again with the same value, and an empty secret on both sides", () => {
    expect(diffOptions(descriptor, { secretKey: SECRET }, { secretKey: SECRET })).toEqual([])
    expect(diffOptions(descriptor, { secretKey: "" }, {})).toEqual([])
  })

  it("compares structured values regardless of key order", () => {
    const before = { webhooks: [{ url: "https://a.test", events: ["paid"] }] }
    const after = { webhooks: [{ events: ["paid"], url: "https://a.test" }] }
    expect(diffOptions(descriptor, before, after)).toEqual([])
    const changed = { webhooks: [{ url: "https://b.test", events: ["paid"] }] }
    expect(diffOptions(descriptor, before, changed)).toEqual([
      { field: "webhooks", label: "demo.webhooks", from: before.webhooks, to: changed.webhooks },
    ])
  })

  it("ignores keys the descriptor does not declare", () => {
    expect(diffOptions(descriptor, { legacyToken: "a" }, { legacyToken: "b" })).toEqual([])
  })

  it("cuts long values and marks the entry", () => {
    const long = "x".repeat(DIFF_MAX_VALUE_LENGTH + 10)
    const [entry] = diffOptions(descriptor, {}, { shopId: long }) as any[]
    expect(entry.to).toHaveLength(DIFF_MAX_VALUE_LENGTH)
    expect(entry.truncated).toBe(true)

    const big = Array.from({ length: 50 }, (_, i) => ({ url: `https://hook-${i}.test` }))
    const [json] = diffOptions(descriptor, {}, { webhooks: big }) as any[]
    expect(typeof json.to).toBe("string")
    expect(json.to).toHaveLength(DIFF_MAX_VALUE_LENGTH)
    expect(json.truncated).toBe(true)
  })

  it("keeps at most the field limit", () => {
    const options: Record<string, any> = {}
    for (let i = 0; i < DIFF_MAX_FIELDS + 20; i++) options[`f${i}`] = { type: "boolean", label: `demo.f${i}` }
    const wide = defineIntegration({
      category: "other",
      displayName: "demo.name",
      options,
      sections: [{ id: "main", title: "demo.main", options: Object.keys(options) }],
    })
    const after = Object.fromEntries(Object.keys(options).map((k) => [k, true]))
    expect(diffOptions(wide, {}, after)).toHaveLength(DIFF_MAX_FIELDS)
  })

  it("drops values once the size budget runs out, then stops", () => {
    const options: Record<string, any> = {}
    for (let i = 0; i < DIFF_MAX_FIELDS + 20; i++) options[`f${i}`] = { type: "string", label: `demo.f${i}` }
    const wide = defineIntegration({
      category: "other",
      displayName: "demo.name",
      options,
      sections: [{ id: "main", title: "demo.main", options: Object.keys(options) }],
    })
    const after = Object.fromEntries(Object.keys(options).map((k) => [k, "y".repeat(DIFF_MAX_VALUE_LENGTH)]))
    const entries = diffOptions(wide, {}, after) as any[]
    expect(JSON.stringify(entries).length).toBeLessThanOrEqual(DIFF_MAX_BYTES)
    expect(entries[0].to).toHaveLength(DIFF_MAX_VALUE_LENGTH)
    const last = entries[entries.length - 1]
    expect(last).toEqual({ field: last.field, label: last.label, from: null, to: null, truncated: true })
  })
})

describe("diffFields", () => {
  it("lists the option ids and label keys once each", () => {
    expect(
      diffFields([
        { field: "apiKey", label: "demo.apiKey", from: "a", to: "b" },
        { field: "secret", label: "demo.secret", secret: true, op: "set" },
        { field: "@title", from: "x", to: "y" },
        { field: "token", label: "demo.apiKey", from: 1, to: 2 },
      ])
    ).toEqual(["apiKey", "demo.apiKey", "secret", "demo.secret", "@title", "token"])
  })

  it("is empty for a change without options", () => {
    expect(diffFields([])).toEqual([])
  })
})

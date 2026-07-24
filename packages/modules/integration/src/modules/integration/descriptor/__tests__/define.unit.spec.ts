import { describe, expect, it } from "@jest/globals"
import { defineIntegration } from "../define"

describe("defineIntegration", () => {
  const d = defineIntegration({
    category: "payment",
    displayName: "demo.name",
    options: {
      terminalKey: { type: "string", required: true, minLength: 1, label: "l" },
      capture: { type: "boolean", default: true, label: "l" },
      ffd: { type: "enum", values: ["1.2", "1.05"], label: "l" },
    },
    sections: [
      { id: "creds", title: "t", options: ["terminalKey"] },
      { id: "behavior", title: "t", options: ["capture", "ffd"] },
    ],
  })

  it("composes an optionsSchema from every option, applying defaults", () => {
    const r = d.optionsSchema.safeParse({ terminalKey: "x" })
    expect(r.success).toBe(true)
    if (r.success) expect((r.data as any).capture).toBe(true)
  })

  it("optionsSchema strips unknown keys", () => {
    const r = d.optionsSchema.safeParse({ terminalKey: "x", bogus: 1 })
    expect(r.success && "bogus" in (r.data as any)).toBe(false)
  })

  it("keeps the options catalog on the descriptor", () => {
    expect(Object.keys(d.options)).toEqual(["terminalKey", "capture", "ffd"])
  })

  it("throws when a section references an unknown option id", () => {
    expect(() =>
      defineIntegration({
        category: "payment",
        displayName: "demo.name",
        options: { a: { type: "string", label: "l" } },
        sections: [{ id: "s", title: "t", options: ["a", "missing"] }],
      })
    ).toThrow(/missing/)
  })
})

import { describe, expect, it } from "@jest/globals"
import { defineIntegration } from "../define"
import type { OptionDef } from "../option"

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

  // A select submits the picked value as a string, so a mixed set makes the mapping back
  // ambiguous: "1" could mean 1 or "1". `OptionDef` instantiates the enum per kind, so this is
  // a type error first; the cast is what a plain-JS consumer would hit, and the runtime guard
  // is the backstop for them.
  it("throws when an enum mixes string and number values", () => {
    expect(() =>
      defineIntegration({
        category: "payment",
        displayName: "demo.name",
        options: { rate: { type: "enum", values: ["a", 1], label: "l" } as unknown as OptionDef },
        sections: [{ id: "s", title: "t", options: ["rate"] }],
      })
    ).toThrow(/mixes number and string enum values/)
  })

  // Compile-time half of the same rule. These never run; they fail the build (which typechecks
  // __tests__) if the barrier regresses, because the directive would go unused.
  it("rejects a mixed set and a cross-kind default at compile time", () => {
    // @ts-expect-error an enum's values must be all strings or all numbers
    const mixed: OptionDef = { type: "enum", values: ["a", 1], label: "l" }
    // @ts-expect-error a numeric enum's default must be a number, not the string "-1"
    const crossKindDefault: OptionDef = { type: "enum", values: [-1, 0, 20], default: "-1", label: "l" }
    // @ts-expect-error a numeric enum cannot carry a string-valued validator
    const wrongValidator: OptionDef = { type: "enum", values: [1, 2], label: "l", validate: (v: string) => v }

    expect([mixed, crossKindDefault, wrongValidator]).toHaveLength(3)
  })

  it("accepts a homogeneous numeric enum", () => {
    const d = defineIntegration({
      category: "payment",
      displayName: "demo.name",
      options: { rate: { type: "enum", values: [-1, 0, 20], default: -1, label: "l" } },
      sections: [{ id: "s", title: "t", options: ["rate"] }],
    })

    const parsed = d.optionsSchema.safeParse({})
    expect(parsed.success && (parsed.data as any).rate).toBe(-1)
  })
})

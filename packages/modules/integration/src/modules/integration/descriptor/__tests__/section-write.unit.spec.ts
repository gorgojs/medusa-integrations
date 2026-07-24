import { describe, expect, it } from "@jest/globals"
import { selectWritableValues } from "../section-write"
import { defineIntegration } from "../define"
import type { IntegrationDescriptor } from "../define"
import { validateOptions } from "../validate"

const secrets = new Set(["password"])

describe("selectWritableValues", () => {
  it("skips a scoped id absent from the payload (never wipes on partial save)", () => {
    const { writeIds, submitted } = selectWritableValues(
      ["terminalKey", "capture"],
      { terminalKey: "t" }, // capture omitted from the payload → left to the caller's stored value
      secrets
    )
    expect(writeIds).toEqual(["terminalKey"])
    expect(submitted).toEqual({ terminalKey: "t" })
    expect(Object.prototype.hasOwnProperty.call(submitted, "capture")).toBe(false)
  })

  it("keeps an existing secret when the submitted value is blank", () => {
    const { writeIds, submitted } = selectWritableValues(["password"], { password: "" }, secrets)
    expect(writeIds).toEqual([])
    expect(Object.prototype.hasOwnProperty.call(submitted, "password")).toBe(false)
  })

  it("writes a non-blank secret", () => {
    const { writeIds, submitted } = selectWritableValues(["password"], { password: "new" }, secrets)
    expect(writeIds).toEqual(["password"])
    expect(submitted).toEqual({ password: "new" })
  })

  it("writes submitted non-secret values, including an explicit blank meant to clear the field", () => {
    const { writeIds, submitted } = selectWritableValues(
      ["capture", "taxation"],
      { capture: false, taxation: "" },
      secrets
    )
    expect(writeIds).toEqual(["capture", "taxation"])
    expect(submitted).toEqual({ capture: false, taxation: "" })
  })
})

describe("partial section save (selectWritableValues + validateOptions)", () => {
  const base = defineIntegration({
    category: "payment",
    displayName: "d",
    options: {
      terminalKey: { type: "string", required: true, minLength: 1, label: "l" },
      password: { type: "string", required: true, minLength: 1, secret: true, label: "l" },
      capture: { type: "boolean", default: true, label: "l" },
    },
    sections: [{ id: "credentials", title: "t", options: ["terminalKey", "password"] }],
  })
  const desc: IntegrationDescriptor = { ...base, identifier: "d", instanceId: null }

  it("validates only the submitted ids — an absent required section field doesn't fail the draft", () => {
    const current = {}
    const { writeIds, submitted } = selectWritableValues(
      ["terminalKey", "password"],
      { terminalKey: "abc" }, // password (required) omitted
      secrets
    )
    const merged = { ...current, ...submitted }
    const res = validateOptions(desc, writeIds, merged)
    expect(res.success).toBe(true)
  })

  it("preserves an unsubmitted stored field instead of wiping it", () => {
    const current = { terminalKey: "keep", capture: false }
    const { writeIds, submitted } = selectWritableValues(
      ["terminalKey", "password"],
      { password: "p" }, // only the secret submitted
      secrets
    )
    const merged = { ...current, ...submitted }
    const validated = validateOptions(desc, writeIds, merged)
    expect(validated.success).toBe(true)
    const full = { ...current, ...(validated.success ? validated.data : {}) }
    expect(full.terminalKey).toBe("keep")
    expect(full.capture).toBe(false)
  })
})

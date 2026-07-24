import { describe, expect, it } from "@jest/globals"
import { defineIntegration } from "../define"
import type { IntegrationDescriptor } from "../define"
import { collectValidationIssues, isDescriptorComplete, validateOptions } from "../validate"

const requiredWhenCapture = (v: unknown, c: any) => {
  if (c.options.capture && (v == null || v === "")) c.addIssue({ message: "required when capture is on" })
}

const base = defineIntegration({
  category: "payment",
  displayName: "demo.name",
  options: {
    terminalKey: { type: "string", required: true, minLength: 1, label: "l" },
    password: { type: "string", required: true, minLength: 1, secret: true, label: "l" },
    capture: { type: "boolean", default: true, label: "l" },
    // per-option cross-field rule (references a sibling)
    fallbackKey: { type: "string", label: "l", validate: requiredWhenCapture },
  },
  sections: [
    { id: "credentials", title: "t", options: ["terminalKey", "password"] },
    { id: "behavior", title: "t", options: ["capture", "fallbackKey"] },
  ],
  // cross-section rule (spans credentials + behavior)
  validate: (full, ctx) => {
    if (full.capture && !full.terminalKey) ctx.addIssue({ path: ["terminalKey"], message: "terminalKey required when capture is on" })
  },
})
const descriptor: IntegrationDescriptor = { ...base, identifier: "demo", instanceId: null }

describe("validateOptions", () => {
  it("validates only the submitted ids and applies their defaults", () => {
    const res = validateOptions(descriptor, ["capture"], { capture: undefined })
    expect(res.success).toBe(true)
    if (res.success) expect(res.data.capture).toBe(true)
  })

  it("reports zod issues for a submitted id", () => {
    const res = validateOptions(descriptor, ["terminalKey"], { terminalKey: "" })
    expect(res.success).toBe(false)
    if (!res.success) expect(res.issues.map((i) => i.path)).toContain("terminalKey")
  })

  it("runs a per-option validate against the merged siblings", () => {
    // fallbackKey blank + capture true → per-option rule fires
    const res = validateOptions(descriptor, ["fallbackKey"], { fallbackKey: "", capture: true })
    expect(res.success).toBe(false)
    if (!res.success) expect(res.issues.map((i) => i.path)).toContain("fallbackKey")
  })
})

describe("isDescriptorComplete / collectValidationIssues", () => {
  it("is incomplete when a required field (any option) is missing", () => {
    expect(isDescriptorComplete(descriptor, { terminalKey: "t" })).toBe(false) // password + fallbackKey rule
  })

  it("is complete when all required present, defaults fill the rest, and rules pass", () => {
    expect(isDescriptorComplete(descriptor, { terminalKey: "t", password: "p", fallbackKey: "f" })).toBe(true)
  })

  it("runs the cross-section validate rule", () => {
    const issues = collectValidationIssues(descriptor, { password: "p", capture: true, fallbackKey: "f" })
    expect(issues.some((i) => i.path === "terminalKey")).toBe(true)
  })
})

describe("validateOptions — empty-string blanks (admin form sentinel)", () => {
  // A conditionally-hidden/blank optional enum reaches the server as "" (the admin form's empty
  // sentinel, submitted by react-hook-form). Saving the section must not error on it.
  const withOptionalEnum = defineIntegration({
    category: "payment",
    displayName: "demo.name",
    options: {
      useReceipt: { type: "boolean", default: false, label: "l" },
      taxation: { type: "enum", values: ["osn", "usn"], label: "l" },
    },
    sections: [{ id: "receipt", title: "t", options: ["useReceipt", "taxation"] }],
  })
  const desc: IntegrationDescriptor = { ...withOptionalEnum, identifier: "demo", instanceId: null }

  it("accepts a blank optional enum submitted as '' and stores it as absent", () => {
    const res = validateOptions(desc, ["useReceipt", "taxation"], { useReceipt: false, taxation: "" })
    expect(res.success).toBe(true)
    if (res.success) expect(res.data.taxation).toBeUndefined()
  })

  it("treats an explicit null as a clear for an optional field (stores absent)", () => {
    const res = validateOptions(desc, ["taxation"], { taxation: null })
    expect(res.success).toBe(true)
    if (res.success) expect(res.data.taxation).toBeUndefined()
  })
})

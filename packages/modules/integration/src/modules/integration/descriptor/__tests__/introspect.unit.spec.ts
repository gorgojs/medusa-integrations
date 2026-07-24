import { describe, expect, it } from "@jest/globals"
import { introspectDescriptor, secretFieldNames } from "../introspect"
import { defineIntegration } from "../define"
import type { IntegrationDescriptor } from "../define"

const base = defineIntegration({
  category: "payment",
  displayName: "demo.name",
  options: {
    login: { type: "string", required: true, minLength: 1, control: "text", label: "demo.fields.login" },
    password: { type: "string", required: true, minLength: 1, secret: true, control: "secret", label: "demo.fields.password" },
    test_mode: { type: "boolean", default: false, control: "switch", label: "demo.fields.test_mode" },
    region: {
      type: "enum",
      values: ["eu", "us"],
      valueLabels: { eu: "demo.region.eu", us: "demo.region.us" },
      control: "select",
      label: "demo.fields.region",
      visibleWhen: { field: "test_mode", equals: true },
    },
    webhooks: { type: "json", default: [], control: "json", label: "demo.fields.webhooks" },
    secretToken: { type: "string", secret: true, label: "demo.fields.secretToken" },
  },
  sections: [
    { id: "general", title: "demo.sections.general", options: ["login", "password"] },
    { id: "behavior", title: "demo.sections.behavior", options: ["test_mode", "region", "webhooks"] },
  ],
})
const descriptor: IntegrationDescriptor = { ...base, identifier: "demo", instanceId: null }

describe("introspect", () => {
  it("groups referenced options by section, omits catalog-only options", () => {
    const ui = introspectDescriptor(descriptor)
    expect(ui.sections.map((s) => s.id)).toEqual(["general", "behavior"])
    expect(ui.sections[1].fields.map((f) => f.name)).toEqual(["test_mode", "region", "webhooks"])
    expect(ui.sections.flatMap((s) => s.fields.map((f) => f.name))).not.toContain("secretToken")
  })

  it("required vs optional derived from the def (default/required, no zod)", () => {
    const ui = introspectDescriptor(descriptor)
    expect(ui.sections[0].fields.find((f) => f.name === "login")!.required).toBe(true)
    expect(ui.sections[1].fields.find((f) => f.name === "test_mode")!.required).toBe(false) // has default
  })

  it("surfaces control, enum options + labels, visibleWhen, json control", () => {
    const ui = introspectDescriptor(descriptor)
    const region = ui.sections[1].fields.find((f) => f.name === "region")!
    expect(region.control).toBe("select")
    expect(region.options).toEqual(["eu", "us"])
    expect(region.optionLabels).toEqual({ eu: "demo.region.eu", us: "demo.region.us" })
    expect(region.visibleWhen).toEqual({ field: "test_mode", equals: true })
    expect(ui.sections[1].fields.find((f) => f.name === "webhooks")!.control).toBe("json")
  })

  it("lists every secret option name (including catalog-only)", () => {
    expect(secretFieldNames(descriptor).sort()).toEqual(["password", "secretToken"])
  })

  it("is JSON-serializable (no functions/zod refs)", () => {
    expect(() => JSON.stringify(introspectDescriptor(descriptor))).not.toThrow()
  })
})

describe("introspect readonly", () => {
  const base = defineIntegration({
    category: "payment",
    displayName: "demo.name",
    options: {
      endpoint: {
        type: "url",
        readonly: true,
        default: "https://api.example.com/hook",
        control: "url",
        label: "demo.fields.endpoint",
      },
      apiSecret: {
        type: "string",
        secret: true,
        readonly: true,
        default: "shh",
        label: "demo.fields.apiSecret",
      },
    },
    sections: [{ id: "s", title: "t", options: ["endpoint", "apiSecret"] }],
  })
  const roDescriptor: IntegrationDescriptor = { ...base, identifier: "demo", instanceId: null }

  it("marks a readonly field disabled and surfaces its default for display", () => {
    const f = introspectDescriptor(roDescriptor).sections[0].fields.find((x) => x.name === "endpoint")!
    expect(f.readonly).toBe(true)
    expect(f.default).toBe("https://api.example.com/hook")
  })

  it("never exposes a secret's default (readonly or not)", () => {
    const f = introspectDescriptor(roDescriptor).sections[0].fields.find((x) => x.name === "apiSecret")!
    expect(f.readonly).toBe(true)
    expect(f.secret).toBe(true)
    expect(f.default).toBeUndefined()
  })
})

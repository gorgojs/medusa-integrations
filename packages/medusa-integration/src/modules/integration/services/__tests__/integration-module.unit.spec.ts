import { describe, expect, it, jest } from "@jest/globals"
import IntegrationModuleService from "../integration-module"
import { defineIntegration } from "../../descriptor/define"

// A representative descriptor: one plain required option, one required secret, one defaulted enum.
const descriptor = defineIntegration({
  category: "payment",
  displayName: "d",
  options: {
    apiKey: { type: "string", required: true, minLength: 1, label: "l" },
    secretKey: { type: "string", required: true, minLength: 1, secret: true, label: "l" },
    mode: { type: "enum", values: ["live", "test"], default: "test", label: "l" },
  },
  sections: [{ id: "creds", title: "t", options: ["apiKey", "secretKey", "mode"] }],
  testConnection: async () => ({ status: "passed" as const }),
})

const registration = {
  key: "int_demo",
  identifier: "demo",
  instanceId: null as string | null,
  provider: {
    descriptor,
    getIdentifier: () => "demo",
    getInstanceId: () => null,
  },
}

function makeProviderService(regs: any[] = [registration]) {
  return {
    listRegistrations: () => regs,
    getRegistration: (k: string) => regs.find((r) => r.key === k),
    retrieveByKey: (k: string) => {
      const r = regs.find((reg) => reg.key === k)
      if (!r) throw new Error(`Unknown ${k}`)
      return r.provider
    },
  }
}

type Row = Record<string, any>

function makeService(opts?: { options?: Record<string, unknown>; rows?: Row[]; providerService?: any; packageMeta?: Record<string, any> }) {
  const rows: Row[] = opts?.rows ?? []
  const svc: any = Object.create(IntegrationModuleService.prototype)
  svc.providerService_ = opts?.providerService ?? makeProviderService()
  svc.options_ = opts?.options ?? { encryptionKey: "unit-test-key" }
  svc.packageMeta_ = opts?.packageMeta ?? {}
  svc.cache_ = new Map()
  svc.listIntegrations = jest.fn(async (filter: any = {}) =>
    rows.filter((r) => (filter?.provider_id ? r.provider_id === filter.provider_id : true))
  )
  svc.createIntegrations = jest.fn(async (data: any) => {
    const row = { id: "int_demo", is_enabled: true, ...data }
    rows.push(row)
    return row
  })
  svc.updateIntegrations = jest.fn(async (data: any) => {
    const row = rows.find((r) => r.id === data.id)
    if (row) Object.assign(row, data)
    return row
  })
  svc.deleteIntegrations = jest.fn(async (id: string) => {
    const i = rows.findIndex((r) => r.id === id)
    if (i >= 0) rows.splice(i, 1)
  })
  svc._rows = rows
  return svc
}

/** A stored row whose `options` are what `encryptForStorage` would persist for `values`. */
function storedRow(svc: any, values: Record<string, unknown>, extra?: Partial<Row>): Row {
  return {
    id: "int_demo",
    provider_id: "int_demo",
    category: "payment",
    title: null,
    is_enabled: true,
    last_test_status: null,
    options: svc.encryptForStorage(descriptor, values),
    ...extra,
  }
}

describe("IntegrationModuleService — encryption", () => {
  it("encrypts secret options inline (ciphertext, not plaintext) and leaves non-secrets", () => {
    const svc = makeService()
    const stored = svc.encryptForStorage(descriptor, { apiKey: "pub", secretKey: "shh", mode: "live" })
    expect(stored.apiKey).toBe("pub")
    expect(stored.mode).toBe("live")
    expect(stored.secretKey).not.toBe("shh") // encrypted
    expect(typeof stored.secretKey).toBe("string")
  })

  it("round-trips secrets back to plaintext via getStoredValues", async () => {
    const svc = makeService()
    const row = storedRow(svc, { apiKey: "pub", secretKey: "shh", mode: "test" })
    svc._rows.push(row)
    const values = await svc.getStoredValues("int_demo")
    expect(values).toEqual({ apiKey: "pub", secretKey: "shh", mode: "test" })
  })

  it("getStoredValues returns {} when there is no row", async () => {
    const svc = makeService()
    expect(await svc.getStoredValues("int_demo")).toEqual({})
  })

  it("throws a helpful error when a secret must be encrypted but no key is configured", () => {
    const svc = makeService({ options: {} }) // no encryptionKey
    expect(() => svc.encryptForStorage(descriptor, { apiKey: "pub", secretKey: "shh" })).toThrow(
      /encryptionKey is required/
    )
  })

  it("does not require a key when the descriptor has no secrets", () => {
    const noSecrets = defineIntegration({
      category: "payment",
      displayName: "d",
      options: { apiKey: { type: "string", label: "l" } },
      sections: [{ id: "s", title: "t", options: ["apiKey"] }],
    })
    const svc = makeService({ options: {} })
    expect(svc.encryptForStorage({ ...noSecrets, identifier: "x", instanceId: null }, { apiKey: "pub" })).toEqual({
      apiKey: "pub",
    })
  })
})

describe("IntegrationModuleService — isComplete", () => {
  it("is false when a required field is missing", () => {
    const svc = makeService()
    const row = storedRow(svc, { apiKey: "pub" }) // secretKey missing
    expect(svc.isComplete(row)).toBe(false)
  })

  it("is true when all required present and defaults fill the rest", () => {
    const svc = makeService()
    const row = storedRow(svc, { apiKey: "pub", secretKey: "shh" }) // mode defaults to "test"
    expect(svc.isComplete(row)).toBe(true)
  })

  it("is false when no provider is registered for the row", () => {
    const svc = makeService({ providerService: makeProviderService([]) })
    expect(svc.isComplete({ provider_id: "int_demo", options: {} })).toBe(false)
  })
})

describe("IntegrationModuleService — getResolvedOptions", () => {
  it("throws when the provider_id is not a registered provider", async () => {
    const svc = makeService({ providerService: makeProviderService([]) })
    await expect(svc.getResolvedOptions("demo", null)).rejects.toThrow(/No integration provider registered/)
  })

  it("returns null when there is no stored row", async () => {
    const svc = makeService()
    expect(await svc.getResolvedOptions("demo", null)).toBeNull()
  })

  it("returns null when the row is disabled", async () => {
    const svc = makeService()
    svc._rows.push(storedRow(svc, { apiKey: "pub", secretKey: "shh" }, { is_enabled: false }))
    expect(await svc.getResolvedOptions("demo", null)).toBeNull()
  })

  it("returns null when enabled but the config is incomplete", async () => {
    const svc = makeService()
    svc._rows.push(storedRow(svc, { apiKey: "pub" }, { is_enabled: true })) // secretKey missing
    expect(await svc.getResolvedOptions("demo", null)).toBeNull()
  })

  it("returns decrypted options with defaults applied when enabled and complete", async () => {
    const svc = makeService()
    svc._rows.push(storedRow(svc, { apiKey: "pub", secretKey: "shh" }, { is_enabled: true }))
    const resolved = await svc.getResolvedOptions("demo", null)
    expect(resolved).not.toBeNull()
    expect(resolved!.options).toEqual({ apiKey: "pub", secretKey: "shh", mode: "test" })
    expect(resolved!.meta).toEqual({ provider_id: "int_demo", category: "payment", is_enabled: true })
  })

  it("serves a cached value within the TTL without hitting the store again", async () => {
    const svc = makeService()
    svc._rows.push(storedRow(svc, { apiKey: "pub", secretKey: "shh" }, { is_enabled: true }))
    await svc.getResolvedOptions("demo", null)
    const callsAfterFirst = svc.listIntegrations.mock.calls.length
    await svc.getResolvedOptions("demo", null)
    expect(svc.listIntegrations.mock.calls.length).toBe(callsAfterFirst) // no extra store read
  })

  it("clearOptionsCache forces a re-read", async () => {
    const svc = makeService()
    svc._rows.push(storedRow(svc, { apiKey: "pub", secretKey: "shh" }, { is_enabled: true }))
    await svc.getResolvedOptions("demo", null)
    const before = svc.listIntegrations.mock.calls.length
    svc.clearOptionsCache("int_demo")
    await svc.getResolvedOptions("demo", null)
    expect(svc.listIntegrations.mock.calls.length).toBeGreaterThan(before)
  })
})

describe("IntegrationModuleService — runTestConnection", () => {
  it("returns skipped when the descriptor has no testConnection", async () => {
    const noTest = defineIntegration({
      category: "payment",
      displayName: "d",
      options: { apiKey: { type: "string", label: "l" } },
      sections: [{ id: "s", title: "t", options: ["apiKey"] }],
    })
    const reg = {
      key: "int_demo",
      identifier: "demo",
      instanceId: null,
      provider: { descriptor: noTest, getIdentifier: () => "demo", getInstanceId: () => null },
    }
    const svc = makeService({ providerService: makeProviderService([reg]) })
    expect(await svc.runTestConnection("int_demo")).toEqual({ status: "skipped", message: "No test configured" })
  })

  it("returns failed 'Not configured' when options don't resolve", async () => {
    const svc = makeService() // no row → getResolvedOptions null
    const res = await svc.runTestConnection("int_demo")
    expect(res).toEqual({ status: "failed", message: "Not configured" })
  })

  it("returns failed for an unknown provider id without throwing", async () => {
    const svc = makeService({ providerService: makeProviderService([]) })
    const res = await svc.runTestConnection("int_missing")
    expect(res.status).toBe("failed")
    expect(res.message).toMatch(/Unknown integration provider/)
  })

  it("passes through the descriptor's testConnection result on success", async () => {
    const svc = makeService()
    svc._rows.push(storedRow(svc, { apiKey: "pub", secretKey: "shh" }, { is_enabled: true }))
    expect(await svc.runTestConnection("int_demo")).toEqual({ status: "passed" })
  })
})

describe("IntegrationModuleService — listIntegrationsOverview", () => {
  it("lists a registered-but-unconfigured provider", async () => {
    const svc = makeService()
    const { integrations } = await svc.listIntegrationsOverview()
    const [item] = integrations
    expect(item).toMatchObject({
      provider_id: "int_demo",
      identifier: "demo",
      is_configured: false,
      is_enabled: false,
      is_complete: false,
      has_test_connection: true,
      last_test_status: null,
    })
  })

  it("reflects a configured + complete + enabled row", async () => {
    const svc = makeService()
    svc._rows.push(storedRow(svc, { apiKey: "pub", secretKey: "shh" }, { is_enabled: true, last_test_status: "passed" }))
    const { integrations } = await svc.listIntegrationsOverview()
    const [item] = integrations
    expect(item).toMatchObject({
      is_configured: true,
      is_enabled: true,
      is_complete: true,
      last_test_status: "passed",
    })
  })

  it("includes package meta (version/author/author_url) and descriptor description", async () => {
    const withDesc = defineIntegration({
      category: "payment",
      displayName: "d",
      description: "demo.desc",
      options: { apiKey: { type: "string", label: "l" } },
      sections: [{ id: "s", title: "t", options: ["apiKey"] }],
    })
    const reg = {
      key: "int_demo",
      identifier: "demo",
      instanceId: null,
      provider: { descriptor: withDesc, getIdentifier: () => "demo", getInstanceId: () => null },
    }
    const svc = makeService({
      providerService: makeProviderService([reg]),
      packageMeta: { demo: { name: "@gorgo/demo", version: "1.2.3", author: "Gorgo", authorUrl: "https://gorgo.dev" } },
    })
    const { integrations } = await svc.listIntegrationsOverview()
    expect(integrations[0]).toMatchObject({
      description: "demo.desc",
      version: "1.2.3",
      author: "Gorgo",
      author_url: "https://gorgo.dev",
    })
  })

  it("filters by category and reports the unfiltered categories facet", async () => {
    const pay = { key: "int_pay", identifier: "pay", instanceId: null, provider: { descriptor: { category: "payment", displayName: "p" }, getIdentifier: () => "pay", getInstanceId: () => null } }
    const ful = { key: "int_ful", identifier: "ful", instanceId: null, provider: { descriptor: { category: "fulfillment", displayName: "f" }, getIdentifier: () => "ful", getInstanceId: () => null } }
    const svc = makeService({ providerService: makeProviderService([pay, ful]) })
    const res = await svc.listIntegrationsOverview({ category: "payment" })
    expect(res.integrations.map((i: any) => i.provider_id)).toEqual(["int_pay"])
    expect(res.count).toBe(1)
    expect(res.categories.sort()).toEqual(["fulfillment", "payment"])
  })

  it("filters by q on the identifier", async () => {
    const pay = { key: "int_pay", identifier: "pay", instanceId: null, provider: { descriptor: { category: "payment", displayName: "p" }, getIdentifier: () => "pay", getInstanceId: () => null } }
    const ful = { key: "int_ful", identifier: "ful", instanceId: null, provider: { descriptor: { category: "fulfillment", displayName: "f" }, getIdentifier: () => "ful", getInstanceId: () => null } }
    const svc = makeService({ providerService: makeProviderService([pay, ful]) })
    const res = await svc.listIntegrationsOverview({ q: "FUL" })
    expect(res.integrations.map((i: any) => i.identifier)).toEqual(["ful"])
    expect(res.count).toBe(1)
  })

  it("paginates via limit/offset while count reflects the full filtered set", async () => {
    const regs = [1, 2, 3].map((n) => ({
      key: `int_p${n}`, identifier: `p${n}`, instanceId: null,
      provider: { descriptor: { category: "payment", displayName: "p" }, getIdentifier: () => `p${n}`, getInstanceId: () => null },
    }))
    const svc = makeService({ providerService: makeProviderService(regs) })
    const res = await svc.listIntegrationsOverview({ limit: 2, offset: 2 })
    expect(res.count).toBe(3)
    expect(res.integrations).toHaveLength(1)
    expect(res.integrations[0].provider_id).toBe("int_p3")
  })
})

describe("IntegrationModuleService — getPackageMeta", () => {
  it("maps the injected package meta for a provider_id (by identifier)", () => {
    const svc = makeService({
      packageMeta: { demo: { name: "@gorgo/demo", version: "1.2.3", author: "Gorgo", authorUrl: "https://gorgo.dev" } },
    })
    expect(svc.getPackageMeta("int_demo")).toEqual({
      version: "1.2.3",
      author: "Gorgo",
      author_url: "https://gorgo.dev",
    })
  })

  it("returns nulls when there is no package meta for the provider", () => {
    const svc = makeService()
    expect(svc.getPackageMeta("int_demo")).toEqual({ version: null, author: null, author_url: null })
  })

  it("returns nulls for an unregistered provider_id", () => {
    const svc = makeService({ providerService: makeProviderService([]) })
    expect(svc.getPackageMeta("int_missing")).toEqual({ version: null, author: null, author_url: null })
  })
})

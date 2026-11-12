import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { INTEGRATION_MODULE } from "@gorgo/medusa-integration"
import path from "path"

jest.setTimeout(120 * 1000)

// Boot ONLY the integration module (moduleIntegrationTestRunner), registering a fake provider
// via the module's own `options.providers` → its `loadProviders` loader. This tests the
// integration plugin in isolation, independent of any real consumer (e.g. T-Kassa).
const resolve = path.dirname(require.resolve("@gorgo/medusa-integration/modules/integration"))
const TEST_PROVIDER = require.resolve("../utils/test-provider")

// identifier "test", instances "a"/"b" → keys int_test_a / int_test_b
const A = "int_test_a"
const B = "int_test_b"
const COMPLETE = { apiKey: "pub", secretKey: "shh" }

moduleIntegrationTestRunner<any>({
  moduleName: INTEGRATION_MODULE,
  resolve,
  moduleOptions: {
    encryptionKey: "test-secret",
    providers: [
      { resolve: TEST_PROVIDER, id: "a", options: {} },
      { resolve: TEST_PROVIDER, id: "b", options: {} },
    ],
  },
  testSuite: ({ service }) => {
    // Real DB shared across the file — start each test from a clean slate.
    beforeEach(async () => {
      const rows = await service.listIntegrations({}, { take: 1000 })
      if (rows.length) await service.deleteIntegrations(rows.map((r: any) => r.id))
      service.clearOptionsCache()
    })

    async function configure(providerId: string, values = COMPLETE, is_enabled = true) {
      const descriptor = service.getProviderDescriptor(providerId)
      const options = service.encryptForStorage(descriptor, values)
      return service.createIntegrations({ provider_id: providerId, category: "payment", options, is_enabled })
    }

    describe("provider registration (real loadProviders loader)", () => {
      it("registers both declared instances of the fake provider", async () => {
        const ids = (await service.listIntegrationsOverview()).integrations.map((o: any) => o.provider_id)
        expect(ids).toContain(A)
        expect(ids).toContain(B)
      })

      it("reports an unconfigured instance with its descriptor metadata", async () => {
        const item = (await service.listIntegrationsOverview()).integrations.find((o: any) => o.provider_id === A)
        expect(item).toMatchObject({
          identifier: "test",
          category: "payment",
          is_configured: false,
          is_enabled: false,
          is_complete: false,
          has_test_connection: true,
          last_test_status: null,
        })
      })
    })

    describe("getResolvedOptions (real DB + encryption)", () => {
      it("returns null before any configuration", async () => {
        expect(await service.getResolvedOptions("test", "a")).toBeNull()
      })

      it("persists secrets encrypted and resolves them decrypted with defaults applied", async () => {
        await configure(A)

        const [row] = await service.listIntegrations({ provider_id: A }, { take: 1 })
        expect(row.options.apiKey).toBe("pub") // non-secret, plain
        expect(row.options.secretKey).not.toBe("shh") // secret, encrypted
        expect(typeof row.options.secretKey).toBe("string")

        const resolved = await service.getResolvedOptions("test", "a")
        expect(resolved).not.toBeNull()
        expect(resolved.options.apiKey).toBe("pub")
        expect(resolved.options.secretKey).toBe("shh") // decrypted
        expect(resolved.options.mode).toBe("test") // descriptor default applied
        expect(resolved.meta).toMatchObject({ provider_id: A, category: "payment", is_enabled: true })
      })

      it("does not resolve a disabled config", async () => {
        await configure(A, COMPLETE, false)
        expect(await service.getResolvedOptions("test", "a")).toBeNull()
      })

      it("does not resolve an incomplete config (missing required secret)", async () => {
        await configure(A, { apiKey: "pub" } as any)
        expect(await service.getResolvedOptions("test", "a")).toBeNull()
      })

      it("resolves each instance independently", async () => {
        await configure(A)
        expect(await service.getResolvedOptions("test", "a")).not.toBeNull()
        expect(await service.getResolvedOptions("test", "b")).toBeNull()
      })

      it("resolves a secret stored in clear text before the option was marked secret", async () => {
        await service.createIntegrations({
          provider_id: A,
          category: "payment",
          options: { apiKey: "pub", secretKey: "saved-in-clear" },
          is_enabled: true,
        })
        expect((await service.getResolvedOptions("test", "a")).options.secretKey).toBe("saved-in-clear")
      })
    })

    describe("runTestConnection", () => {
      it("reports 'Not configured' when options don't resolve", async () => {
        expect(await service.runTestConnection(A)).toEqual({ status: "failed", message: "Not configured" })
      })

      it("delegates to the descriptor's testConnection once configured", async () => {
        await configure(A)
        expect(await service.runTestConnection(A)).toEqual({ status: "passed" })
      })
    })

    describe("listIntegrationsOverview after configuration", () => {
      it("marks a complete, enabled config as configured + complete + enabled", async () => {
        await configure(A)
        const item = (await service.listIntegrationsOverview()).integrations.find((o: any) => o.provider_id === A)
        expect(item).toMatchObject({ is_configured: true, is_complete: true, is_enabled: true })
      })
    })

    describe("recordChange", () => {
      beforeEach(async () => {
        const changes = await service.listIntegrationChanges({}, { take: 1000, select: ["id"] })
        if (changes.length) await service.deleteIntegrationChanges(changes.map((c: any) => c.id))
      })

      it("stores a change and returns its id", async () => {
        const id = await service.recordChange({
          provider_id: A,
          change_type: "updated",
          actor: { type: "system" },
          diff: [{ field: "apiKey", from: "a", to: "b" }],
        })
        expect(id).toMatch(/^intch_/)
        const [row] = await service.listIntegrationChanges({ id }, { take: 1 })
        expect(row).toMatchObject({ provider_id: A, actor_type: "system", diff: [{ field: "apiKey", from: "a", to: "b" }] })
        expect(row.created_at).toBeInstanceOf(Date)
      })

      it("stores the option ids and label keys of the change for the search", async () => {
        const id = await service.recordChange({
          provider_id: A,
          change_type: "updated",
          actor: { type: "system" },
          diff: [
            { field: "apiKey", label: "test.apiKey", from: "a", to: "b" },
            { field: "token", secret: true, op: "set" },
          ],
        })
        const [row] = await service.listIntegrationChanges({ id }, { take: 1, select: ["id", "diff_fields"] })
        expect(row.diff_fields).toEqual(["apiKey", "test.apiKey", "token"])
      })

      it("never throws when a change cannot be stored", async () => {
        await expect(
          service.recordChange({ provider_id: null, change_type: "updated", actor: { type: "system" } })
        ).resolves.toBeNull()
      })

      it("keeps the history when the integration row is deleted", async () => {
        const row = await configure(A)
        await service.recordChange({ provider_id: A, change_type: "created", actor: { type: "system" } })
        await service.deleteIntegrations(row.id)
        expect(await service.listIntegrationChanges({ provider_id: A }, { take: 10 })).toHaveLength(1)
      })
    })
  },
})

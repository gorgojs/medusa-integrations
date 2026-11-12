import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { INTEGRATION_MODULE } from "@gorgo/medusa-integration"
import path from "path"

jest.setTimeout(120 * 1000)

// Before 2.0 a registration without an `id` was keyed `int_<identifier>`; now it is the instance
// `default`. The plugin's migration script moves the settings and the change history stored under
// the old key.
const resolve = path.dirname(require.resolve("@gorgo/medusa-integration/modules/integration"))
const packageRoot = path.dirname(require.resolve("@gorgo/medusa-integration/package.json"))
const script = require(
  path.join(packageRoot, ".medusa/server/src/migration-scripts/integration-default-instance-keys")
)
const TEST_PROVIDER = require.resolve("../utils/test-provider")

const LEGACY = "int_test"
const DEFAULT = "int_test_default"
const NAMED = "int_test_a"
const COMPLETE = { apiKey: "pub", secretKey: "shh" }

moduleIntegrationTestRunner<any>({
  moduleName: INTEGRATION_MODULE,
  resolve,
  moduleOptions: {
    encryptionKey: "test-secret",
    providers: [
      { resolve: TEST_PROVIDER, options: {} },
      { resolve: TEST_PROVIDER, id: "a", options: {} },
    ],
  },
  testSuite: ({ service }) => {
    beforeEach(async () => {
      const rows = await service.listIntegrations({}, { take: 1000 })
      if (rows.length) await service.deleteIntegrations(rows.map((r: any) => r.id))
      const changes = await service.listIntegrationChanges({}, { take: 1000 })
      if (changes.length) await service.deleteIntegrationChanges(changes.map((c: any) => c.id))
      service.clearOptionsCache()
    })

    /** Run the script as `medusa db:migrate` does, and return what it logged. */
    async function migrate(): Promise<string[]> {
      const info = jest.fn()
      const container = { resolve: (key: string) => (key === "logger" ? { info } : service) }
      await script.default({ container })
      service.clearOptionsCache()
      return info.mock.calls.map((call) => String(call[0]))
    }

    async function storeUnder(providerId: string, values = COMPLETE) {
      const options = service.encryptForStorage(service.getProviderDescriptor(DEFAULT), values)
      return service.createIntegrations({ provider_id: providerId, category: "payment", options, is_enabled: true })
    }

    async function recordUnder(providerId: string) {
      return service.createIntegrationChanges({
        actor_type: "system",
        change_type: "updated",
        provider_id: providerId,
        diff: [],
      })
    }

    const settingsKeys = async () => (await service.listIntegrations({})).map((r: any) => r.provider_id).sort()
    const historyKeys = async () => (await service.listIntegrationChanges({})).map((c: any) => c.provider_id)

    it("registers a provider without an id as the default instance", async () => {
      const ids = (await service.listIntegrationsOverview()).integrations.map((o: any) => o.provider_id)
      expect(ids.sort()).toEqual([NAMED, DEFAULT])
    })

    it("moves the settings and the history of the old key to the default instance", async () => {
      await storeUnder(LEGACY)
      await recordUnder(LEGACY)
      await recordUnder(LEGACY)

      expect(await migrate()).toEqual([expect.stringContaining("Moved 1 integration(s) and 2 change history entries")])

      expect(await settingsKeys()).toEqual([DEFAULT])
      expect(await historyKeys()).toEqual([DEFAULT, DEFAULT])
      expect((await service.getResolvedOptions("test"))!.options).toMatchObject(COMPLETE)
    })

    it("moves the history of the old key whose settings were deleted", async () => {
      await recordUnder(LEGACY)

      await migrate()

      expect(await historyKeys()).toEqual([DEFAULT])
    })

    it("leaves the old key alone when the default instance already has settings", async () => {
      await storeUnder(LEGACY, { apiKey: "old", secretKey: "old" })
      await storeUnder(DEFAULT)

      expect(await migrate()).toEqual([])
      expect(await settingsKeys()).toEqual([LEGACY, DEFAULT])
      expect((await service.getResolvedOptions("test"))!.options).toMatchObject(COMPLETE)
    })

    it("does nothing the second time", async () => {
      await storeUnder(LEGACY)
      await migrate()

      expect(await migrate()).toEqual([])
      expect(await settingsKeys()).toEqual([DEFAULT])
    })
  },
})

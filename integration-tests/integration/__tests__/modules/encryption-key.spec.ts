import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { INTEGRATION_MODULE } from "@gorgo/medusa-integration"
import path from "path"

jest.setTimeout(120 * 1000)

// Boot the module WITHOUT an encryptionKey but with a secret-bearing provider, to assert the
// module refuses to persist a secret rather than storing it in plaintext.
const resolve = path.dirname(require.resolve("@gorgo/medusa-integration/modules/integration"))
const TEST_PROVIDER = require.resolve("../utils/test-provider")

moduleIntegrationTestRunner<any>({
  moduleName: INTEGRATION_MODULE,
  resolve,
  moduleOptions: {
    // no encryptionKey on purpose
    providers: [{ resolve: TEST_PROVIDER, id: "a", options: {} }],
  },
  testSuite: ({ service }) => {
    it("throws a helpful error when a secret must be encrypted but no encryptionKey is configured", () => {
      const descriptor = service.getProviderDescriptor("int_test_a")
      expect(() => service.encryptForStorage(descriptor, { apiKey: "pub", secretKey: "shh" })).toThrow(
        /encryptionKey is required/
      )
    })

    it("still registers the provider and lists it (boot does not require a key)", async () => {
      const ids = (await service.listIntegrationsOverview()).integrations.map((o: any) => o.provider_id)
      expect(ids).toContain("int_test_a")
    })
  },
})

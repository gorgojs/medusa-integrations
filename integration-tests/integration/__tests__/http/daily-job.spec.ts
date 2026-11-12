import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
// The scheduled job is auto-loaded by Medusa in the real app; here we import and invoke it
// directly against the booted container (it runs testIntegrationConnectionWorkflow per target).
import testIntegrationConnectionsJob from "../utils/connections-job"

jest.setTimeout(120 * 1000)

const A = "int_test_a"
const B = "int_test_b"

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    let svc: any

    beforeAll(() => {
      svc = getContainer().resolve("integration")
    })

    beforeEach(async () => {
      const rows = await svc.listIntegrations({}, { take: 1000 })
      if (rows.length) await svc.deleteIntegrations(rows.map((r: any) => r.id))
      svc.clearOptionsCache()
    })

    async function configure(providerId: string, is_enabled = true) {
      const descriptor = svc.getProviderDescriptor(providerId)
      const options = svc.encryptForStorage(descriptor, { apiKey: "pub", secretKey: "shh" })
      await svc.createIntegrations({ provider_id: providerId, category: "payment", options, is_enabled })
    }

    it("tests only configured + enabled integrations and persists last_test_status", async () => {
      await configure(A, true)
      await configure(B, false) // disabled → must be skipped

      await testIntegrationConnectionsJob(getContainer())

      const [rowA] = await svc.listIntegrations({ provider_id: A }, { take: 1 })
      const [rowB] = await svc.listIntegrations({ provider_id: B }, { take: 1 })
      expect(rowA.last_test_status).toBe("passed") // fake provider's testConnection → passed
      expect(rowB.last_test_status).toBeNull() // disabled → never tested
    })

    it("does nothing when there are no configured integrations", async () => {
      await expect(testIntegrationConnectionsJob(getContainer())).resolves.toBeUndefined()
    })
  },
})

import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { INTEGRATION_MODULE } from "@gorgo/medusa-integration"
import path from "path"

jest.setTimeout(120 * 1000)

// The other module specs build the schema from the models. This one builds it by running the
// module's own migrations, as `db:migrate` does in a project, so it catches what only the
// migrations leave behind.
const resolve = path.dirname(require.resolve("@gorgo/medusa-integration/modules/integration"))

// Every category a descriptor can declare.
const CATEGORIES = [
  "payment", "notification", "fulfillment", "search", "content", "analytics", "authentication",
  "erp", "crm", "pim", "marketplace", "feed", "file_providers", "other",
]

moduleIntegrationTestRunner<any>({
  moduleName: INTEGRATION_MODULE,
  resolve,
  pathToMigrations: path.join(resolve, "migrations"),
  moduleOptions: { encryptionKey: "test-secret", providers: [] },
  testSuite: ({ service }) => {
    // The column was created as `plugin_kind` with an inline check, which kept rejecting search,
    // content, analytics, authentication and file_providers after the rename to `category`.
    it("stores every category a descriptor can declare", async () => {
      for (const category of CATEGORIES) {
        await service.createIntegrations({ provider_id: `int_category_${category}`, category, options: {} })
      }
      const rows = await service.listIntegrations({ provider_id: CATEGORIES.map((c) => `int_category_${c}`) })
      expect(rows.map((r: any) => r.category).sort()).toEqual([...CATEGORIES].sort())
    })
  },
})

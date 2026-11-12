import path from "path"
import type { MedusaContainer } from "@medusajs/framework/types"

/**
 * The daily connection check is a scheduled job, not part of the module's public exports, so the
 * tests load its built file from the package directory, the way Medusa's job loader finds it.
 */
const moduleDir = path.dirname(require.resolve("@gorgo/medusa-integration/package.json"))

const testIntegrationConnectionsJob: (container: MedusaContainer) => Promise<void> = require(
  path.join(moduleDir, ".medusa/server/src/jobs/test-integration-connections")
).default

export default testIntegrationConnectionsJob

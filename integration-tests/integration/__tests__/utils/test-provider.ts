import { AbstractIntegrationProviderService, defineIntegration, INTEGRATION_MODULE } from "@gorgo/medusa-integration"
import type { IntegrationDescriptorInput } from "@gorgo/medusa-integration"
import { ModuleProvider } from "@medusajs/framework/utils"

// A minimal fake integration provider used ONLY by the integration module's integration tests.
// It exercises the descriptor engine end-to-end: a required plain option, a required secret,
// a defaulted enum, and a connection test. Loaded by the module's provider loader (via require,
// so jest transpiles this .ts) using an absolute path from require.resolve.
const descriptor = defineIntegration({
  category: "payment",
  displayName: "test.name",
  options: {
    apiKey: { type: "string", required: true, minLength: 1, label: "test.apiKey" },
    secretKey: { type: "string", required: true, minLength: 1, secret: true, label: "test.secretKey" },
    mode: { type: "enum", values: ["live", "test"], default: "test", label: "test.mode" },
  },
  sections: [{ id: "creds", title: "test.creds", options: ["apiKey", "secretKey", "mode"] }],
  testConnection: async ({ options }) => {
    if (!options.apiKey || !options.secretKey) {
      return { status: "failed", message: "Missing credentials" }
    }
    return { status: "passed" }
  },
})

class TestIntegrationProvider extends AbstractIntegrationProviderService {
  static identifier = "test"
  get descriptor(): IntegrationDescriptorInput {
    return descriptor
  }
}

export default ModuleProvider(INTEGRATION_MODULE, { services: [TestIntegrationProvider] })

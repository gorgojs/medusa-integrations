import { ModuleProvider } from "@medusajs/framework/utils"
import { INTEGRATION_MODULE } from "@gorgo/medusa-integration/modules/integration"
import { TkassaIntegrationProvider } from "./services"

export default ModuleProvider(INTEGRATION_MODULE, {
  services: [TkassaIntegrationProvider],
})

import { ModuleProvider } from "@medusajs/framework/utils"
import { INTEGRATION_MODULE } from "@gorgo/medusa-integration"
import { OnecIntegrationProvider } from "./services"

export default ModuleProvider(INTEGRATION_MODULE, {
  services: [OnecIntegrationProvider],
})

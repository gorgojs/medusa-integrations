import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { AuthorizeNetService } from "./services"

const services = [AuthorizeNetService]

export default ModuleProvider(Modules.PAYMENT, {
  services,
})

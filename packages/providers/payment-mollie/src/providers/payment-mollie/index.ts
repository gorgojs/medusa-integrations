import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { MollieService } from "./services"

const services = [MollieService]

export default ModuleProvider(Modules.PAYMENT, {
  services,
})

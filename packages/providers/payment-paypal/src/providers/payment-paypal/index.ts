import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { PayPalService } from "./services"

const services = [PayPalService]

export default ModuleProvider(Modules.PAYMENT, {
  services,
})

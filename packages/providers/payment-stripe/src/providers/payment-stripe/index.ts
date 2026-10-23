import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { StripeService } from "./services"

const services = [StripeService]

export default ModuleProvider(Modules.PAYMENT, {
  services,
})

import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import {
  YookassaService,
} from "./services"

const services = [
  YookassaService,
]

export default ModuleProvider(Modules.PAYMENT, {
  services,
})

import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import {
  RobokassaService,
} from "./services"

const services = [
  RobokassaService,
]

export default ModuleProvider(Modules.PAYMENT, {
  services,
})
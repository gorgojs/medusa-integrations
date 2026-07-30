import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import {
  TkassaService,
} from "./services"

const services = [
  TkassaService,
]

export default ModuleProvider(Modules.PAYMENT, {
  services,
})
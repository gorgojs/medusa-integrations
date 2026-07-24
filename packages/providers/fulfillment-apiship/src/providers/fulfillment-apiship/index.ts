import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import {
  ApishipService
} from "./services"

const services = [
  ApishipService,
]

export default ModuleProvider(Modules.FULFILLMENT, {
  services,
})
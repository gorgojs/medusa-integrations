import { defineMiddlewares } from "@medusajs/framework"
import { adminIntegrationRoutesMiddlewares } from "./admin/integrations/middlewares"

export default defineMiddlewares({
  routes: [
    ...adminIntegrationRoutesMiddlewares
  ]
})

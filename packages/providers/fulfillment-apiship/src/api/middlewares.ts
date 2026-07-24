import { defineMiddlewares } from "@medusajs/framework/http"
import { adminApishipRoutesMiddlewares } from "./admin/apiship/middlewares"
import { storeApishipRoutesMiddlewares } from "./store/apiship/middlewares"

export default defineMiddlewares({
  routes: [
    ...adminApishipRoutesMiddlewares,
    ...storeApishipRoutesMiddlewares,
  ]
})

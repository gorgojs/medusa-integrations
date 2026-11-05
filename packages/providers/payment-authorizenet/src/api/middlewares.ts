import { defineMiddlewares } from "@medusajs/framework/http"
import { storeAuthorizeNetRoutesMiddlewares } from "./store/authorizenet/middlewares"

export default defineMiddlewares({
  routes: [...storeAuthorizeNetRoutesMiddlewares],
})

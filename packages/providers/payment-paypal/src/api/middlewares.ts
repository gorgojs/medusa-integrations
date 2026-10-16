import { defineMiddlewares } from "@medusajs/framework/http"
import { storePayPalRoutesMiddlewares } from "./store/paypal/middlewares"

export default defineMiddlewares({
  routes: [...storePayPalRoutesMiddlewares],
})

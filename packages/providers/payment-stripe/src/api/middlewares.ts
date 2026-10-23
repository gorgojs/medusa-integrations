import { defineMiddlewares } from "@medusajs/framework/http"
import { storeStripeRoutesMiddlewares } from "./store/stripe/middlewares"

export default defineMiddlewares({
  routes: [...storeStripeRoutesMiddlewares],
})

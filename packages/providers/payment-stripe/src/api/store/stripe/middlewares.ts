import { MiddlewareRoute, validateAndTransformQuery } from "@medusajs/framework/http"
import { StoreStripeInstanceQuery } from "./validators"

export const storeStripeRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/stripe/config",
    method: "GET",
    middlewares: [validateAndTransformQuery(StoreStripeInstanceQuery, { defaults: [], isList: false })],
  },
]

import { MiddlewareRoute, validateAndTransformQuery } from "@medusajs/framework/http"
import { StoreGetPayPalPayer, StorePayPalInstanceQuery } from "./validators"

export const storePayPalRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/paypal/config",
    method: "GET",
    middlewares: [validateAndTransformQuery(StorePayPalInstanceQuery, { defaults: [], isList: false })],
  },
  {
    matcher: "/store/paypal/orders/:order_id/payer",
    method: "GET",
    middlewares: [validateAndTransformQuery(StoreGetPayPalPayer, { defaults: [], isList: false })],
  },
]

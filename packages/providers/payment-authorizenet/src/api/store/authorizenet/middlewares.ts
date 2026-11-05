import { MiddlewareRoute, validateAndTransformQuery } from "@medusajs/framework/http"
import { StoreAuthorizeNetInstanceQuery } from "./validators"

export const storeAuthorizeNetRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/authorizenet/config",
    method: "GET",
    middlewares: [validateAndTransformQuery(StoreAuthorizeNetInstanceQuery, { defaults: [], isList: false })],
  },
]

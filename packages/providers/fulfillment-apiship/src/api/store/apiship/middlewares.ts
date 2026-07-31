import {
  MiddlewareRoute,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import {
  StoreCalculateApishipShippingOption,
  StoreGetApishipPoints,
  StoreApishipInstanceQuery,
} from "./validators"
import * as queryConfig from "./query-config"

export const storeApishipRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/apiship/points",
    method: "GET",
    middlewares: [
      validateAndTransformQuery(
        StoreGetApishipPoints,
        queryConfig.listTransformQueryConfig
      ),
    ],
  },
  {
    matcher: "/store/apiship/providers",
    method: "GET",
    middlewares: [
      validateAndTransformQuery(StoreApishipInstanceQuery, { defaults: [], isList: false }),
    ],
  },
  {
    matcher: "/store/apiship/:shipping_option_id/calculate",
    method: "POST",
    middlewares: [
      validateAndTransformBody(StoreCalculateApishipShippingOption),
    ],
  },
]

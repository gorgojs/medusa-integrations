import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformQuery, validateAndTransformBody } from "@medusajs/framework"
import { AdminGetFeedsParams, AdminCreateFeed } from "./validators"
import * as queryConfig from "./query-config"

export const adminFeedsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/feeds",
    middlewares: [
      validateAndTransformQuery(
        AdminGetFeedsParams,
        queryConfig.listTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/feeds",
    middlewares: [
      validateAndTransformBody(AdminCreateFeed),
      validateAndTransformQuery(
        AdminGetFeedsParams,
        queryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
]

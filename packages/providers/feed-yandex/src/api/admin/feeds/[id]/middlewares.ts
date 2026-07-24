import { MiddlewareRoute } from "@medusajs/framework/http"
import {
  validateAndTransformQuery,
  validateAndTransformBody,
} from "@medusajs/framework"
import { AdminUpdateFeed, AdminGetFeedParams } from "./validators"
import * as queryConfig from "./query-config"

export const adminFeedByIdMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/feeds/:id",
    middlewares: [
      validateAndTransformQuery(
        AdminGetFeedParams,
        queryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
  {
    method: ["PATCH"],
    matcher: "/admin/feeds/:id",
    middlewares: [
      validateAndTransformBody(AdminUpdateFeed),
      validateAndTransformQuery(
        AdminGetFeedParams,
        queryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/admin/feeds/:id",
    middlewares: [
      validateAndTransformQuery(
        AdminGetFeedParams,
        queryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
]
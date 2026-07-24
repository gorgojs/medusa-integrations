import { validateAndTransformBody, validateAndTransformQuery } from "@medusajs/framework/http"
import { MiddlewareRoute } from "@medusajs/framework/http"
import {
  AdminGetApishipPointsParams,
  AdminCreateApishipConnection,
  AdminUpdateApishipConnection,
  AdminUpdateApishipOptions
} from "./validators"
import * as queryConfig from "./query-config"

export const adminApishipRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/apiship/points",
    method: "GET",
    middlewares: [
      validateAndTransformQuery(
        AdminGetApishipPointsParams,
        queryConfig.listTransformQueryConfig
      )
    ],
  },
  {
    matcher: "/admin/apiship/connections",
    method: "POST",
    middlewares: [
      validateAndTransformBody(AdminCreateApishipConnection)
    ],
  },
  {
    matcher: "/admin/apiship/connections/:id",
    method: "POST",
    middlewares: [
      validateAndTransformBody(AdminUpdateApishipConnection)
    ],
  },
  {
    matcher: "/admin/apiship/options",
    method: "POST",
    middlewares: [
      validateAndTransformBody(AdminUpdateApishipOptions)
    ],
  },
]

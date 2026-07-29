import { validateAndTransformBody, validateAndTransformQuery } from "@medusajs/framework/http"
import { MiddlewareRoute } from "@medusajs/framework/http"
import {
  AdminGetApishipPointsParams,
  AdminCreateApishipConnection,
  AdminUpdateApishipConnection,
  AdminUpdateApishipOptions,
  AdminApishipProviderIdQuery
} from "./validators"
import * as queryConfig from "./query-config"

const providerIdQueryConfig = { defaults: [], isList: false }

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
    matcher: "/admin/apiship/providers",
    method: "GET",
    middlewares: [
      validateAndTransformQuery(AdminApishipProviderIdQuery, providerIdQueryConfig)
    ],
  },
  {
    matcher: "/admin/apiship/account-connections",
    method: "GET",
    middlewares: [
      validateAndTransformQuery(AdminApishipProviderIdQuery, providerIdQueryConfig)
    ],
  },
  {
    matcher: "/admin/apiship/connections",
    method: "GET",
    middlewares: [
      validateAndTransformQuery(AdminApishipProviderIdQuery, providerIdQueryConfig)
    ],
  },
  {
    matcher: "/admin/apiship/connections",
    method: "POST",
    middlewares: [
      validateAndTransformBody(AdminCreateApishipConnection),
      validateAndTransformQuery(AdminApishipProviderIdQuery, providerIdQueryConfig)
    ],
  },
  {
    matcher: "/admin/apiship/connections/:id",
    method: ["GET", "POST", "DELETE"],
    middlewares: [
      validateAndTransformQuery(AdminApishipProviderIdQuery, providerIdQueryConfig)
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
    method: ["GET", "POST"],
    middlewares: [
      validateAndTransformQuery(AdminApishipProviderIdQuery, providerIdQueryConfig)
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

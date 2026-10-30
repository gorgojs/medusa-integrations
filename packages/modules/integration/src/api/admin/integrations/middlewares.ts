import { MiddlewareRoute, validateAndTransformBody, validateAndTransformQuery } from "@medusajs/framework/http"
import {
  AdminUpsertIntegration,
  AdminSetIntegrationEnabled,
  AdminGetIntegrationsParams,
  AdminGetIntegrationChangesParams,
  AdminGetIntegrationChangeParams,
} from "./validators"
import * as changesQueryConfig from "./changes/query-config"

export const adminIntegrationRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/admin/integrations",
    // Minimal queryConfig: this endpoint is an in-memory list, not a remote-query entity —
    // we only need `req.validatedQuery`. `entity`/`defaults` are inert here. `as any` mirrors
    // the existing body-validator cast (zod-4 vs the generic's deep instantiation).
    middlewares: [
      validateAndTransformQuery(AdminGetIntegrationsParams as any, {
        entity: "integration",
        isList: true,
        defaults: [],
        defaultLimit: 20,
      } as any),
    ],
  },
  // Change history: read-only. Nothing but GET is declared on these paths.
  {
    methods: ["GET"],
    matcher: "/admin/integrations/changes",
    middlewares: [
      validateAndTransformQuery(AdminGetIntegrationChangesParams as any, changesQueryConfig.listTransformQueryConfig as any),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/integrations/changes/:id",
    middlewares: [
      validateAndTransformQuery(AdminGetIntegrationChangeParams as any, changesQueryConfig.retrieveTransformQueryConfig as any),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/integrations/:provider_id/changes",
    middlewares: [
      validateAndTransformQuery(AdminGetIntegrationChangesParams as any, changesQueryConfig.listTransformQueryConfig as any),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/integrations/:provider_id",
    // `as any` flattens a TS2589 (excessively deep instantiation) that zod-4 schema types
    // trigger against validateAndTransformBody's generic. Runtime validation is unchanged;
    // `req.validatedBody` is typed explicitly in the route via AdminUpsertIntegrationType.
    middlewares: [validateAndTransformBody(AdminUpsertIntegration as any)],
  },
  {
    methods: ["POST"],
    matcher: "/admin/integrations/:provider_id/enable",
    middlewares: [validateAndTransformBody(AdminSetIntegrationEnabled as any)],
  },
]

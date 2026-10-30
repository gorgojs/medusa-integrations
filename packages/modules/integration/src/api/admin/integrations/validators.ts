import { z } from "@medusajs/deps/zod"
import { createFindParams, createOperatorMap, createSelectParams } from "@medusajs/medusa/api/utils/validators"

export type AdminUpsertIntegrationType = z.infer<typeof AdminUpsertIntegration>
export const AdminUpsertIntegration = z.object({
  // Omitted → the stored title is kept; explicit `null` → cleared.
  title: z.string().nullable().optional(),
  // Which descriptor section these values belong to. Omitted by widgets, which submit
  // their own option ids directly — the server then validates exactly the submitted keys.
  section_id: z.string().optional(),
  values: z.record(z.string(), z.unknown()),
})

export type AdminSetIntegrationEnabledType = z.infer<typeof AdminSetIntegrationEnabled>
export const AdminSetIntegrationEnabled = z.object({
  is_enabled: z.boolean(),
})

export type AdminGetIntegrationsParamsType = z.infer<typeof AdminGetIntegrationsParams>
export const AdminGetIntegrationsParams = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const stringOrArray = z.union([z.string(), z.array(z.string())])

// `createFindParams` has no upper bound on `limit`, so it is re-declared here with one (the
// preprocess mirrors the original: query-string values arrive as strings).
const changesLimit = z.preprocess(
  (val) => (val && typeof val === "string" ? parseInt(val) : val),
  z.number().int().min(1).max(100).optional().default(20)
)

export type AdminGetIntegrationChangesParamsType = z.infer<typeof AdminGetIntegrationChangesParams>
export const AdminGetIntegrationChangesParams = createFindParams({
  limit: 20,
  offset: 0,
  // Newest first unless the request sets its own `order`.
  order: "-occurred_at",
})
  .extend({ limit: changesLimit })
  .merge(
    z.object({
      provider_id: stringOrArray.optional(),
      change_type: stringOrArray.optional(),
      outcome: stringOrArray.optional(),
      actor_id: stringOrArray.optional(),
      occurred_at: createOperatorMap().optional(),
    })
  )

export type AdminGetIntegrationChangeParamsType = z.infer<typeof AdminGetIntegrationChangeParams>
export const AdminGetIntegrationChangeParams = createSelectParams()

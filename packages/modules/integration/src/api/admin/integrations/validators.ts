import { z } from "@medusajs/deps/zod"

export type AdminUpsertIntegrationType = z.infer<typeof AdminUpsertIntegration>
export const AdminUpsertIntegration = z.object({
  title: z.string().optional(),
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

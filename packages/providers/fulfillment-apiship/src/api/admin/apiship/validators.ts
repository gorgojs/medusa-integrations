import { z } from "@medusajs/framework/zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

// Registration key (`int_apiship[_<instance_id>]`) of the integration instance a request
// targets — every admin route below accepts it as an optional query param, defaulting to the
// base instance when omitted (see DEFAULT_APISHIP_PROVIDER_ID).
export type AdminApishipProviderIdQueryType = z.infer<typeof AdminApishipProviderIdQuery>
export const AdminApishipProviderIdQuery = z.object({
  provider_id: z.string().optional(),
})

export const AdminGetApishipPointsParams = createFindParams({
  limit: 50,
  offset: 0,
}).merge(
  z.object({
    key: z.string().optional(),
    filter: z.string().optional(),
    provider_id: z.string().optional(),
  })
)

export type AdminCreateApishipConnectionType = z.infer<typeof AdminCreateApishipConnection>
export const AdminCreateApishipConnection = z.object({
  name: z.string().optional(),
  provider_key: z.string(),
  provider_connect_id: z.string(),
  point_in_id: z.string().optional(),
  point_in_address: z.string().optional(),
  is_enabled: z.boolean(),
})

export type AdminUpdateApishipConnectionType = z.infer<typeof AdminUpdateApishipConnection>
export const AdminUpdateApishipConnection = z.object({
  name: z.string().optional(),
  provider_key: z.string().optional(),
  provider_connect_id: z.string().optional(),
  point_in_id: z.string().optional(),
  point_in_address: z.string().optional(),
  is_enabled: z.boolean().optional(),
})

export type AdminGetApishipPointsParamsType = z.infer<typeof AdminGetApishipPointsParams>
export type AdminUpdateApishipOptionsType = z.infer<typeof AdminUpdateApishipOptions>
export const AdminUpdateApishipOptions = z.strictObject({
  connections: z.array(z.strictObject({
    id: z.string(),
    name: z.string().optional(),
    provider_key: z.string(),
    provider_connect_id: z.string(),
    point_in_id: z.string().optional(),
    point_in_address: z.string().optional(),
    is_enabled: z.boolean(),
  })).optional(),
})

import { z } from "@medusajs/framework/zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

const DeliveryCostVatSchema = z.union([
  z.literal(-1),
  z.literal(0),
  z.literal(5),
  z.literal(7),
  z.literal(10),
  z.literal(20),
  z.literal(22),
])

export const AdminGetApishipPointsParams = createFindParams({
  limit: 50,
  offset: 0,
}).merge(
  z.object({
    key: z.string().optional(),
    filter: z.string().optional(),
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
export const AdminUpdateApishipOptions = z.object({
  token: z.string().optional(),
  is_test: z.boolean().optional(),
  settings: z.object({
    connections: z.array(z.object({
      id: z.string(),
      name: z.string().optional(),
      provider_key: z.string(),
      provider_connect_id: z.string(),
      point_in_id: z.string().optional(),
      point_in_address: z.string().optional(),
      is_enabled: z.boolean(),
    })).optional(),
    default_sender_settings: z.object({
      country_code: z.string().optional(),
      address_string: z.string().optional(),
      contact_name: z.string().optional(),
      phone: z.string().optional(),
    }).optional(),
    default_product_sizes: z.object({
      length: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      weight: z.number().optional(),
    }).optional(),
    delivery_cost_vat: DeliveryCostVatSchema.optional(),
    is_cod: z.boolean().optional(),
  }).optional(),
})

import { z } from "@medusajs/framework/zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

export const StoreGetApishipPoints = createFindParams({
  limit: 50,
  offset: 0,
}).merge(
  z.object({
    key: z.string().optional(),
    filter: z.string().optional(),
    provider_id: z.string().optional(),
    shipping_option_id: z.string().optional(),
  })
)

// Registration key (`int_apiship[_<instance_id>]`) of the integration instance a request
// targets — defaults to the base instance when omitted (see DEFAULT_APISHIP_PROVIDER_ID).
// `shipping_option_id` is the preferred way to target an instance: the store never has to
// know the raw provider_id, it's derived from which ApiShip instance fulfills that option.
export type StoreApishipProviderIdQueryType = z.infer<typeof StoreApishipProviderIdQuery>
export const StoreApishipProviderIdQuery = z.object({
  provider_id: z.string().optional(),
  shipping_option_id: z.string().optional(),
})

export const StoreCalculateApishipShippingOption = z.object({
  cart_id: z.string(),
})

export type StoreGetApishipPointsType = z.infer<typeof StoreGetApishipPoints>
export type StoreCalculateApishipShippingOptionType = z.infer<
  typeof StoreCalculateApishipShippingOption
>

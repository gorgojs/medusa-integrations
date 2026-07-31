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

/**
 * Which ApiShip instance a store request targets, in order of precedence:
 *
 * 1. `provider_id` — an explicit registration key.
 * 2. `shipping_option_id` — preferred during checkout: the storefront doesn't have to know
 *    the key, `resolveApishipProviderIdStep` derives it from what fulfills that option.
 * 3. Neither — the default instance (`int_apiship`), which only exists when the provider is
 *    declared WITHOUT an `id` in medusa-config.
 */
export type StoreApishipInstanceQueryType = z.infer<typeof StoreApishipInstanceQuery>
export const StoreApishipInstanceQuery = z.object({
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

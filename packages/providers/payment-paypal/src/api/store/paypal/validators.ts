import { z } from "@medusajs/framework/zod"

/**
 * Which PayPal instance a store request targets: `provider_id` (`int_paypal[_<instance>]`), or the
 * only registered one when it is omitted.
 */
export type StorePayPalInstanceQueryType = z.infer<typeof StorePayPalInstanceQuery>
export const StorePayPalInstanceQuery = z.object({
  provider_id: z.string().optional(),
})

export type StoreGetPayPalPayerType = z.infer<typeof StoreGetPayPalPayer>
export const StoreGetPayPalPayer = StorePayPalInstanceQuery.extend({
  cart_id: z.string().min(1),
})

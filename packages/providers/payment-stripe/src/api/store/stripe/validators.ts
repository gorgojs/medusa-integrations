import { z } from "@medusajs/framework/zod"

/**
 * Which Stripe instance a store request targets: `provider_id` (`int_stripe[_<instance>]`), or the
 * only registered one when it is omitted.
 */
export type StoreStripeInstanceQueryType = z.infer<typeof StoreStripeInstanceQuery>
export const StoreStripeInstanceQuery = z.object({
  provider_id: z.string().optional(),
})

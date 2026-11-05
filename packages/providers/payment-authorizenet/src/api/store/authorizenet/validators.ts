import { z } from "@medusajs/framework/zod"

/**
 * Which Authorize.net instance a store request targets: `provider_id` (`int_authorizenet[_<instance>]`),
 * or the only registered one when it is omitted.
 */
export type StoreAuthorizeNetInstanceQueryType = z.infer<typeof StoreAuthorizeNetInstanceQuery>
export const StoreAuthorizeNetInstanceQuery = z.object({
  provider_id: z.string().optional(),
})

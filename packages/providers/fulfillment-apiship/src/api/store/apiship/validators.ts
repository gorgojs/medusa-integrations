import { z } from "@medusajs/framework/zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

export const StoreGetApishipPoints = createFindParams({
  limit: 50,
  offset: 0,
}).merge(
  z.object({
    key: z.string().optional(),
    filter: z.string().optional(),
  })
)

export const StoreCalculateApishipShippingOption = z.object({
  cart_id: z.string(),
})

export type StoreGetApishipPointsType = z.infer<typeof StoreGetApishipPoints>
export type StoreCalculateApishipShippingOptionType = z.infer<
  typeof StoreCalculateApishipShippingOption
>

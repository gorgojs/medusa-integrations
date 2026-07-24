import { z } from "zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

export const AdminGetFeedsParams = createFindParams({ limit: 20, offset: 0 })

export const AdminCreateFeed = z.object({
  feeds: z.array(
    z.object({
      title: z.string(),
      file_name: z.string(),
      is_active: z.boolean(),
      schedule: z.number().optional(),
    })
  ),
})

export type AdminCreateFeedType = z.infer<typeof AdminCreateFeed>
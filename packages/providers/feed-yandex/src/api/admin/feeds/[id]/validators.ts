import { z } from "zod"

export const AdminGetFeedParams = z.object({
  fields: z.string().optional(),
})

const CategorySchema = z.object({
  id: z.string(),
  parentId: z.string().optional(),
  value: z.string(),
})

const SettingsSchema = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  url: z.string().optional(),
  platform: z.string().optional(),
  categories: z.array(CategorySchema).optional(),
})

export const AdminUpdateFeed = z.object({
  id: z.string(),
  title: z.string().optional(),
  file_name: z.string().optional(),
  file_path: z.string().optional(),
  last_export_at: z.coerce.date().optional(),
  schedule: z.number().optional(),
  is_active: z.boolean().optional(),
  settings: SettingsSchema.optional(),
})

export type AdminGetFeedParamsType = z.infer<typeof AdminGetFeedParams>
export type AdminUpdateFeedType = z.infer<typeof AdminUpdateFeed>
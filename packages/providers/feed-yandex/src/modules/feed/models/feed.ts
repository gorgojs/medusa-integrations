import { model } from "@medusajs/framework/utils"

const Feed = model.define("feed", {
  id: model.id().primaryKey(),
  title: model.text().nullable(),
  file_name: model.text().nullable(),
  file_path: model.text().nullable(),
  last_export_at: model.dateTime().nullable(),
  is_active: model.boolean().default(false),
  schedule: model.number().default(30),
  settings: model.json().nullable()
})
  
export default Feed
import { model } from "@medusajs/framework/utils"
import { IntegrationCategory } from "../utils/integration"

const Integration = model.define("integration", {
  id: model.id({ prefix: "int" }).primaryKey(),

  // Plugin identity
  category: model.enum(IntegrationCategory),
  provider_id: model.text(),
  title: model.text().nullable(),

  // Integration options (non-secret settings)
  options: model.json().default({}),

  // Metadata
  is_enabled: model.boolean().default(true),
  // Result of the last connection test, an `IntegrationLastTest`. Null until the first test.
  last_test: model.json().nullable(),

  // Free-form data of the store's own code, as on any Medusa entity. The module never reads it.
  metadata: model.json().nullable(),
})
.indexes([
  { on: ["provider_id"], unique: true },
  { on: ["category"] },
])

export default Integration

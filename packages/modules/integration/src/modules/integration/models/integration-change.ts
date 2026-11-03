import { model } from "@medusajs/framework/utils"

// One row per change of an integration's settings. Deliberately NOT a relation to the
// `integration` model (no `belongsTo`, no foreign key, no cascade): the history has to outlive the
// integration it describes, deletion included. The integration tests check that it does.
const IntegrationChange = model.define("integration_change", {
  id: model.id({ prefix: "intch" }).primaryKey(),
  occurred_at: model.dateTime(),

  // Who: Medusa's actor type as-is ("user", "api-key"), or "system" without a request.
  actor_type: model.text(),
  actor_id: model.text().nullable(),
  // The user's email or the API key's title at the time of the change.
  actor_label: model.text().nullable(),

  // What: IntegrationChangeType. Text, not an enum, so a new change type needs no migration.
  change_type: model.text(),

  // On what: the integration's `provider_id`, kept as plain text.
  provider_id: model.text(),
  identifier: model.text().nullable(),
  instance_id: model.text().nullable(),
  category: model.text().nullable(),
  section_id: model.text().nullable(),

  // Details: DiffEntry[]. Secret options appear without values.
  diff: model.json(),
  reverts_id: model.text().nullable(),

  // From where.
  request_id: model.text().nullable(),
  ip: model.text().nullable(),
  user_agent: model.text().nullable(),
}).indexes([
  { on: ["provider_id", "occurred_at"] },
  { on: ["occurred_at"] },
  { on: ["actor_id"], where: "actor_id IS NOT NULL" },
])

export default IntegrationChange

import { model } from "@medusajs/framework/utils"

// One row per change of an integration's settings. Deliberately NOT a relation to the
// `integration` model (no `belongsTo`, no foreign key, no cascade): the history has to outlive the
// integration it describes, deletion included. The integration tests check that it does.
//
// When: `created_at`. A change is recorded in the same workflow that makes it, so the row's own
// creation time is the time of the change.
const IntegrationChange = model.define("integration_change", {
  id: model.id({ prefix: "intch" }).primaryKey(),

  // Who: Medusa's actor type as-is ("user", "api-key"), or "system" without a request.
  actor_type: model.text(),
  actor_id: model.text().nullable(),
  // The user's email or the API key's title at the time of the change.
  actor_label: model.text().nullable(),

  // What: IntegrationChangeType. Text, not an enum, so a new change type needs no migration.
  change_type: model.text(),

  // On what: the integration's `provider_id`, kept as plain text. It is `int_<identifier>_<instance>`,
  // so the provider and the instance need no columns of their own.
  provider_id: model.text(),

  // Details: DiffEntry[]. Secret options appear without values.
  diff: model.json(),
  // The option ids and label keys in `diff`, so the search can find a change by the options it
  // touched. Not returned by the API.
  diff_fields: model.array().default([]),

  // From where.
  request_id: model.text().nullable(),
  ip: model.text().nullable(),
  user_agent: model.text().nullable(),
}).indexes([
  { on: ["provider_id", "created_at"] },
  { on: ["created_at"] },
  { on: ["actor_id"], where: "actor_id IS NOT NULL" },
])

export default IntegrationChange

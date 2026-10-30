import type { I18nKey } from "../../modules/integration/descriptor/meta"

// Domain types for the settings change history (`integration_history` module). Zod-free, like the
// rest of `src/types`, so the admin and the http types can share them.

export type IntegrationChangeType =
  | "created"
  | "updated"
  | "enabled"
  | "disabled"
  | "deleted"
  | "connection_tested"

export type IntegrationChangeOutcome = "succeeded" | "failed"

/**
 * Who made a change. `type` is Medusa's `auth_context.actor_type` as-is (`"user"`, `"api-key"`),
 * or `"job"` / `"system"` for changes made without an HTTP request.
 */
export type IntegrationChangeActor = {
  type: "user" | "api-key" | "job" | "system" | (string & {})
  id?: string | null
  ip?: string | null
  user_agent?: string | null
  request_id?: string | null
}

/** A changed plain option: its values before and after. `null` means no value. */
export type DiffValueEntry = {
  /** Option id from the descriptor, or `"@title"` for the record's title. */
  field: string
  /** The option's label key at the time of the change, so the entry stays readable if the option is removed later. */
  label?: I18nKey
  from: unknown
  to: unknown
  /** A value was cut to fit the size limits. */
  truncated?: true
}

/** A changed secret option. Its value is never stored, only what happened to it. */
export type DiffSecretEntry = {
  field: string
  label?: I18nKey
  secret: true
  op: "set" | "replaced" | "removed"
}

export type DiffEntry = DiffValueEntry | DiffSecretEntry

/** One entry of the change history, as the integration module's service stores it. */
export type RecordIntegrationChangeInput = {
  provider_id: string
  change_type: IntegrationChangeType
  outcome: IntegrationChangeOutcome
  actor: IntegrationChangeActor
  actor_label?: string | null
  identifier?: string | null
  instance_id?: string | null
  category?: string | null
  section_id?: string | null
  diff?: DiffEntry[]
  message?: string | null
  reverts_id?: string | null
  /** Defaults to now. */
  occurred_at?: Date
}

import type { I18nKey } from "../../modules/integration/descriptor/meta"

// Domain types for the settings change history (`integration_change` rows). Zod-free, like the
// rest of `src/types`, so the admin and the http types can share them.

export type IntegrationChangeType =
  | "created"
  | "updated"
  | "enabled"
  | "disabled"
  | "deleted"

/**
 * Who made a change. `type` is Medusa's `auth_context.actor_type` as-is (`"user"`, `"api-key"`),
 * or `"system"` for changes made without an HTTP request. `"job"` is the daily connection test,
 * which reaches only the `integration.tested` event, never the change history.
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

/**
 * A changed secret option. Its value is never stored, only what happened to it. `"hidden"` is set
 * by the read routes for an entry recorded while the option was still plain and is secret now.
 */
export type DiffSecretEntry = {
  field: string
  label?: I18nKey
  secret: true
  op: "set" | "replaced" | "removed" | "hidden"
}

export type DiffEntry = DiffValueEntry | DiffSecretEntry

/** An option the change history names: its id and the label key it was stored with. */
export type IntegrationChangeField = { field: string; label: I18nKey | null }

/**
 * An admin user the change history names: the user's id and their name or email now, or the
 * email stored with their changes once the account is gone. `null` when there is neither.
 */
export type IntegrationChangeUser = { id: string; label: string | null }

/** One entry of the change history, as the integration module's service stores it. */
export type RecordIntegrationChangeInput = {
  provider_id: string
  change_type: IntegrationChangeType
  actor: IntegrationChangeActor
  actor_label?: string | null
  diff?: DiffEntry[]
  /** Defaults to now. */
  created_at?: Date
}

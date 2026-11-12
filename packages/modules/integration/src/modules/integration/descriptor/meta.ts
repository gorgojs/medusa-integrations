/**
 * An i18n key resolved admin-side against the merged i18next resources (`t(key)`). Providers
 * ship the translations from their `src/admin/i18n/index.ts`; missing keys fall back to the
 * key string itself.
 */
export type I18nKey = string

/**
 * The Admin control an option renders with.
 *
 * Values are added in minor releases and removed or renamed only in major ones, so handle a value
 * you don't know.
 */
export type FieldControl =
  | "text"
  | "secret"
  | "switch"
  | "number"
  | "url"
  | "select"
  | "json"

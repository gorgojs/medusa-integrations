/**
 * An i18n key resolved admin-side against the merged i18next resources (`t(key)`). The Admin
 * looks it up in the `gorgo` namespace first, then in Medusa's default `translation` namespace,
 * so a provider ships its translations from its `src/admin/i18n/index.ts` under either one. A key
 * in another namespace takes the `namespace:key` form. Missing keys fall back to the key string
 * itself.
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

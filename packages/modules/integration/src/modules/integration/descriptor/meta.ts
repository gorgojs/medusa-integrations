/**
 * An i18n key resolved admin-side against the merged i18next resources (`t(key)`). Providers
 * ship the translations from their `src/admin/i18n/index.ts`; missing keys fall back to the
 * key string itself.
 */
export type I18nKey = string

export type FieldControl =
  | "text"
  | "secret"
  | "switch"
  | "number"
  | "url"
  | "select"
  | "json"

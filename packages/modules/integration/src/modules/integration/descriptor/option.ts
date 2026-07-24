import type { I18nKey, FieldControl } from "./meta"

export type OptionIssue = { message: string; path?: (string | number)[] }
export type OptionValidateContext = {
  /** The full merged config (this option's siblings) — cast to read specific keys. */
  options: Record<string, unknown>
  addIssue: (issue: OptionIssue) => void
}

/** Declarative UI-visibility rule, evaluated admin-side against sibling values (JSON-serializable). */
export type VisibleWhen = { field: string; equals: string | number | boolean }

type OptionBase = {
  control?: FieldControl
  label: I18nKey
  hint?: I18nKey
  placeholder?: I18nKey
  secret?: boolean
  /** Required = rejects `undefined`. Optional by default; a `default` also implies present. */
  required?: boolean
  /** Hide this field in the admin unless the rule holds (UI-only; server requiredness lives in `validate`). */
  visibleWhen?: VisibleWhen
  readonly?: boolean
}

export type StringOption = OptionBase & {
  type: "string"
  default?: string
  minLength?: number
  maxLength?: number
  pattern?: string
  validate?: (v: string | undefined, c: OptionValidateContext) => void
}
export type UrlOption = OptionBase & {
  type: "url"
  default?: string
  /** Restrict the URL scheme, e.g. ["https"]. Omit to allow any protocol. */
  protocols?: string[]
  validate?: (v: string | undefined, c: OptionValidateContext) => void
}
export type EmailOption = OptionBase & {
  type: "email"
  default?: string
  validate?: (v: string | undefined, c: OptionValidateContext) => void
}
export type UuidOption = OptionBase & {
  type: "uuid"
  default?: string
  validate?: (v: string | undefined, c: OptionValidateContext) => void
}
export type NumberOption  = OptionBase & {
  type: "number"
  default?: number
  min?: number
  max?: number
  int?: boolean
  positive?: boolean
  nonnegative?: boolean
  multipleOf?: number
  validate?: (v: number | undefined, c: OptionValidateContext) => void
}
export type BooleanOption = OptionBase & {
  type: "boolean"
  default?: boolean
  validate?: (v: boolean | undefined, c: OptionValidateContext) => void
}
export type EnumOption<V extends string = string> = OptionBase & {
  type: "enum"
  values: readonly V[]
  valueLabels?: Partial<Record<V, I18nKey>>
  default?: V
  validate?: (v: V | undefined, c: OptionValidateContext) => void
}
export type JsonOption = OptionBase & {
  type: "json"
  default?: unknown
  validate?: (v: unknown, c: OptionValidateContext) => void
}

export type OptionDef =
  | StringOption
  | UrlOption
  | EmailOption
  | UuidOption
  | NumberOption
  | BooleanOption
  | EnumOption
  | JsonOption

export type OptionValue<D> =
  D extends { type: "enum"; values: readonly (infer V)[] } ? V :
  D extends { type: "boolean" } ? boolean :
  D extends { type: "number" } ? number :
  D extends { type: "string" | "url" | "email" | "uuid" } ? string :
  D extends { type: "json" } ? unknown :
  unknown
type Present<D> =
  D extends { default: unknown } ? true :
  D extends { required: true } ? true :
  false
export type Settings<O extends Record<string, OptionDef>> =
  { [K in keyof O as Present<O[K]> extends true ? K : never]-?: OptionValue<O[K]> } &
  { [K in keyof O as Present<O[K]> extends true ? never : K]?: OptionValue<O[K]> }

import type { I18nKey, FieldControl } from "../../modules/integration/descriptor/meta"

// Domain types for the integration module. Kept zod-free so admin (browser) code and the
// http types can depend on them without pulling zod's type graph into the type-check.
// Re-exported so the http layer can import domain bits from `src/types/integration`.
export type { I18nKey }

// The `IntegrationCategory` / `IntegrationTestStatus` const objects and their derived string unions
// live in `utils` (Medusa-style — runtime "enums" in utils). Imported for local use + re-exported
// so the domain-type surface stays in `src/types`; import the const *values* from `utils/integration`.
import type { CategoryKind, TestStatus } from "../../modules/integration/utils/integration"
export type { CategoryKind, TestStatus }

export type IntegrationLayouts = "core:single-column" | "core:two-column"

export interface TestConnectionContext {
  options: Record<string, unknown>
}

export interface TestConnectionResult {
  status: TestStatus
  message?: string
}

// ── UI descriptor (introspected options; produced server-side, consumed by the admin) ──
export interface UiField {
  name: string
  control: FieldControl
  secret: boolean
  required: boolean
  label: I18nKey
  hint?: I18nKey
  placeholder?: string
  options?: string[]
  /** For `select`: i18n-key label per enum value (value → key). UI shows the label, stores the value. */
  optionLabels?: Partial<Record<string, I18nKey>>
  /** Descriptor default for a (non-secret) field — pre-fills the edit form when there's no stored value. */
  default?: unknown
  /** Declarative UI visibility (evaluated admin-side against sibling values). */
  visibleWhen?: { field: string; equals: string | number | boolean }
  /** Render the control disabled in the admin (display-only; not enforced server-side). */
  readonly?: boolean
}

export interface UiSection {
  id: string
  title: I18nKey
  column: "main" | "side"
  fields: UiField[]
}

/**
 * Data the integration settings page passes to a provider's custom-section widget
 * (via `LayoutComposer`'s `data` prop → the widget's `data` prop). Secrets are never
 * included — anything needing a secret must go through a server endpoint.
 */
export interface IntegrationSectionData {
  /** Registration key `int_<identifier>[_<instanceId>]` — pass to API calls. */
  providerId: string
  /** The provider's `static identifier` (e.g. "tkassa"). */
  identifier: string
  /** Current non-secret options for this integration. */
  values: Record<string, unknown>
  /** Whether the stored config passes full validation (use to gate actions). */
  isComplete: boolean
}

export interface UiDescriptor {
  category: string
  identifier: string
  instanceId: string | null
  displayName: I18nKey
  description?: I18nKey
  icon?: string
  docsUrl?: string
  supportsMultipleInstances: boolean
  preferredLayoutId: IntegrationLayouts
  hasTestConnection: boolean
  sections: UiSection[]
}

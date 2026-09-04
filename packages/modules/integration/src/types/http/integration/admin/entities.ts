import type { I18nKey, CategoryKind, TestStatus } from "../../../integration"

/** One declared integration instance (registration) merged with its current row state. */
export interface IntegrationOverviewItem {
  provider_id: string
  identifier: string
  instance_id: string | null
  category: CategoryKind
  display_name: I18nKey
  /** Descriptor description (i18n key) — shown in the list's Description column. */
  description?: I18nKey
  /** Descriptor icon — any `<img src>` string (data URI / URL / `/static` path). */
  icon?: string
  /** Plugin package version (from package.json), or null if unresolved. */
  version: string | null
  /** Plugin author name (package.json author, else npm-scope-derived), or null. */
  author: string | null
  /** Author link (package.json author.url / homepage), or null. */
  author_url: string | null
  supports_multiple_instances: boolean
  has_test_connection: boolean
  is_configured: boolean
  is_enabled: boolean
  /** Stored config passes full validation (all required fields + cross-section rules). */
  is_complete: boolean
  last_test_status: TestStatus | null
}

/** Client-facing view of an integration record — secrets are never included. */
export interface MaskedIntegration {
  id: string
  provider_id: string
  category: CategoryKind
  title: string | null
  is_enabled: boolean
  /** Secret option keys that currently have a stored value (per field; the value is never sent). */
  configured_secrets: string[]
  last_test_status: TestStatus | null
  values: Record<string, unknown>
}

/** One integration in the Gorgo catalog (from the live Gorgo API, with an offline yml fallback). */
export interface CatalogIntegration {
  integrationId: string
  slug: string
  npm: string
  category: string
  author: string
  authorLocalized: string
  label: string
  shortDescription: string
  repository: string
  /** Dropped at the catalog boundary unless it is an absolute https URL — see `isSafeHref`. */
  docsUrl?: string
  /**
   * Markdown setup guide shown in the Admin install drawer, per locale. Either locale may be
   * absent: the catalog boundary keeps a locale only when it is a usable string, so a
   * single-locale snippet is common, not malformed.
   */
  docsSnippet?: { en?: string; ru?: string }
  /** Icon URL (relative to the Gorgo host). */
  icon: string
  /**
   * Whether the package is free or sold. Absent means free: the field is optional in the catalog
   * schema, and an unknown value is dropped at the boundary rather than trusted.
   */
  tier?: "oss" | "pro"
  stars: number | null
  downloads: number | null
}

/** A catalog entry merged with local install state. */
export interface CatalogItem extends CatalogIntegration {
  /** True when a provider with this `integrationId` is registered in this project. */
  installed: boolean
  /** The registered `provider_id` when installed, else null. */
  provider_id: string | null
}

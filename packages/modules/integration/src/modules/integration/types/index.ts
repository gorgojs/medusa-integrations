import type { ModuleProvider } from "@medusajs/framework/types"

/** Awilix list-key under which every registered integration-provider key is collected. */
export const IntegrationProviderRegistrationKey = "integration_providers"

/** Prefix for each provider's container registration key: `int_<identifier>[_<id>]`. */
export const IntegrationProviderRegistrationPrefix = "int_"

/** Container key under which the resolved module options are registered. */
export const INTEGRATION_OPTIONS_KEY = "integrationModuleOptions"

/** Container key under which the resolved per-identifier package metadata map is registered. */
export const INTEGRATION_PACKAGE_META_KEY = "integrationPackageMeta"

/** Resolved npm-package facts for one provider identifier (from its package.json). */
export type PackageMeta = {
  name: string | null
  version: string | null
  author: string | null
  authorUrl: string | null
  /** `gorgo.license` from the package.json: whether the package is licensed at all. */
  license: PackageLicenseRequirement
}

/** How a package declares itself licensed. `null` = not a licensed package. */
export type PackageLicenseRequirement = "required" | "optional" | null

/** Verdict of the license check for one npm package, as `@gorgo/license` reports it. */
export type LicenseState = "pending" | "ok" | "failed" | "unreachable"

export type LicenseStateEntry = {
  package: string
  state: LicenseState
  /** Why the check failed: `missing`, `invalid_token`, `domain_not_allowed` and so on. */
  reason?: string
  /** When the platform last answered, ISO 8601. */
  checked_at: string | null
  project: { handle: string; name: string } | null
  /** `null` when the backend's host is in none of the project's environments. Absent before the first answer. */
  environment?: { id: string; name: string } | null
  subscription: { ends_at: string | null; cutoff: string | null } | null
  latest_allowed_version: string | null
  /** Provider identifiers this package ships. Empty for a package that registers itself. */
  identifiers: string[]
}

/** identifier → PackageMeta. Empty when resolution is unavailable. */
export type PackageMetaMap = Record<string, PackageMeta>

export type IntegrationModuleOptions = {
  /** Any non-empty secret; SHA-256-derived to a 32-byte AES-256-GCM key. High-entropy recommended (openssl rand -hex 32). */
  encryptionKey?: string
  /** Integration-providers, each `{ resolve, id?, options? }` — like payment/fulfillment. */
  providers?: ModuleProvider[]
  /** Project license key. Defaults to `GORGO_LICENSE`. */
  license?: string
}

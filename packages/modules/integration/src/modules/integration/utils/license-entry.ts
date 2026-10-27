import type { LicenseState as LibraryLicenseState } from "@gorgo/license"
import type { LicenseStateEntry, LicenseStatus, PackageMetaMap } from "../types"

const KNOWN: ReadonlySet<string> = new Set<LicenseStatus>(["pending", "ok", "failed", "unreachable"])

/** Provider identifiers the package ships, so the admin list can tie a verdict to its row. */
function identifiersOf(packageMeta: PackageMetaMap, packageName: string): string[] {
  return Object.entries(packageMeta)
    .filter(([, meta]) => meta.name === packageName)
    .map(([identifier]) => identifier)
}

/**
 * The verdicts `@gorgo/license` holds, in the admin API's shape. A package that registers itself,
 * such as a plain payment provider, ships no integration provider and gets no identifiers.
 */
export function toLicenseStateEntries(
  states: Record<string, LibraryLicenseState>,
  packageMeta: PackageMetaMap,
): LicenseStateEntry[] {
  return Object.entries(states).map(([packageName, s]) => ({
    package: packageName,
    state: KNOWN.has(s.state) ? s.state : "pending",
    ...(s.reason ? { reason: s.reason } : {}),
    checked_at: typeof s.checkedAt === "number" ? new Date(s.checkedAt).toISOString() : null,
    ...(s.host ? { host: s.host } : {}),
    project: s.project ?? null,
    ...(s.environment !== undefined ? { environment: s.environment } : {}),
    subscription: s.subscription ?? null,
    latest_allowed_version: s.latestAllowedVersion ?? null,
    identifiers: identifiersOf(packageMeta, packageName),
  }))
}

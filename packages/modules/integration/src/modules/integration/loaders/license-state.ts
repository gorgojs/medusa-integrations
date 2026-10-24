import type { LicenseState, LicenseStateEntry } from "../types"

/** One package's verdict as `@gorgo-store/license` keeps it. */
type VerifierState = {
  state?: string
  reason?: string
  checkedAt?: number
  project?: { handle: string; name: string }
  environment?: { id: string; name: string } | null
  subscription?: { ends_at: string | null; cutoff: string | null }
  latestAllowedVersion?: string | null
}

/** The part of `@gorgo-store/license` this module uses. */
export type LicenseVerifier = {
  configureLicense(input: Record<string, unknown>): void
  registerLicensedPackage(input: { packageName?: string; packageVersion?: string }): string | undefined
  licenseStates(): Record<string, VerifierState>
  recheckLicense(): Promise<void>
}

const KNOWN: ReadonlySet<string> = new Set<LicenseState>(["pending", "ok", "failed", "unreachable"])

/**
 * Every copy of `@gorgo-store/license` the loader reached. Usually one, but two paid packages that
 * depend on different versions bring two, each holding the verdicts of its own packages.
 */
const verifiers = new Set<LicenseVerifier>()
const identifiersByPackage = new Map<string, string[]>()

export function isLicenseVerifier(mod: unknown): mod is LicenseVerifier {
  const m = mod as Partial<Record<keyof LicenseVerifier, unknown>> | null
  return (
    typeof m?.configureLicense === "function" &&
    typeof m?.registerLicensedPackage === "function" &&
    typeof m?.licenseStates === "function" &&
    typeof m?.recheckLicense === "function"
  )
}

/** Remembers a copy of the library. Returns `false` when it was already known. */
export function addVerifier(verifier: LicenseVerifier): boolean {
  if (verifiers.has(verifier)) return false
  verifiers.add(verifier)
  return true
}

/** Ties a provider identifier to the npm package that ships it, for the admin list. */
export function linkIdentifier(packageName: string, identifier: string): void {
  const identifiers = identifiersByPackage.get(packageName) ?? []
  if (!identifiers.includes(identifier)) identifiers.push(identifier)
  identifiersByPackage.set(packageName, identifiers)
}

function toEntry(packageName: string, s: VerifierState): LicenseStateEntry {
  return {
    package: packageName,
    state: s.state && KNOWN.has(s.state) ? (s.state as LicenseState) : "pending",
    ...(s.reason ? { reason: s.reason } : {}),
    checked_at: typeof s.checkedAt === "number" ? new Date(s.checkedAt).toISOString() : null,
    project: s.project ?? null,
    ...(s.environment !== undefined ? { environment: s.environment } : {}),
    subscription: s.subscription ?? null,
    latest_allowed_version: s.latestAllowedVersion ?? null,
    identifiers: identifiersByPackage.get(packageName) ?? [],
  }
}

/**
 * Current verdict of every package the library checks in this process, read live on each call: the
 * check runs in the background, so nothing is known yet while the loader runs. A package that
 * registers itself, such as a plain payment provider, is listed too, with no identifiers.
 */
export function licenseStates(): LicenseStateEntry[] {
  const entries = new Map<string, LicenseStateEntry>()
  for (const verifier of verifiers) {
    try {
      for (const [name, s] of Object.entries(verifier.licenseStates())) {
        if (!entries.has(name)) entries.set(name, toEntry(name, s ?? {}))
      }
    } catch {
      continue
    }
  }
  return [...entries.values()]
}

/** Checks every package right away, for "Check now" in the admin. */
export async function recheckLicenses(): Promise<LicenseStateEntry[]> {
  await Promise.all([...verifiers].map((v) => v.recheckLicense().catch(() => undefined)))
  return licenseStates()
}

export function resetLicenseStateForTests(): void {
  verifiers.clear()
  identifiersByPackage.clear()
}

import type { LicenseState, LicenseStateEntry, LicenseStateMap } from "../types"

export type LicenseStateReader = (
  packageName: string,
) => { state: string; reason?: string } | undefined

const store: LicenseStateMap = {}
let reader: LicenseStateReader | undefined

const KNOWN: ReadonlySet<string> = new Set<LicenseState>(["ok", "grace", "stale", "failed"])

export function normalizeLicenseState(state: string | undefined): LicenseState {
  return state && KNOWN.has(state) ? (state as LicenseState) : "undetermined"
}

export function setLicenseStateReader(fn: LicenseStateReader | undefined): void {
  reader = fn
}

/**
 * The verdicts the `checkLicenses` loader reached at boot. A single object shared by the loader,
 * the module service and the admin route: the loader fills it in place, so readers do not depend
 * on being constructed after it ran.
 */
export function licenseStateStore(): LicenseStateMap {
  return store
}

export function licenseStates(): LicenseStateEntry[] {
  return Object.values(store).map((entry) => {
    const live = reader?.(entry.package)
    if (!live) return entry
    const { reason: _previous, ...rest } = entry
    return {
      ...rest,
      state: normalizeLicenseState(live.state),
      ...(live.reason ? { reason: live.reason } : {}),
    }
  })
}

export function resetLicenseStateStoreForTests(): void {
  for (const key of Object.keys(store)) delete store[key]
  reader = undefined
}

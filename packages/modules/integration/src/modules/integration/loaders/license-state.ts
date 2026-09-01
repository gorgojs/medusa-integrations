import type { LicenseStateEntry, LicenseStateMap } from "../types"

const store: LicenseStateMap = {}

/**
 * The verdicts the `checkLicenses` loader reached at boot. A single object shared by the loader,
 * the module service and the admin route: the loader fills it in place, so readers do not depend
 * on being constructed after it ran.
 */
export function licenseStateStore(): LicenseStateMap {
  return store
}

export function licenseStates(): LicenseStateEntry[] {
  return Object.values(store)
}

export function resetLicenseStateStoreForTests(): void {
  for (const key of Object.keys(store)) delete store[key]
}

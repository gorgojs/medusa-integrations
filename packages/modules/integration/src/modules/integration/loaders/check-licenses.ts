import { asValue } from "@medusajs/framework/awilix"
import type { LoaderOptions } from "@medusajs/framework/types"
import { createTelemetryClient } from "@gorgo/telemetry"
import {
  INTEGRATION_LICENSE_STATE_KEY,
  INTEGRATION_PACKAGE_META_KEY,
  IntegrationProviderRegistrationPrefix,
} from "../types"
import { licenseStateStore } from "./license-state"
import type {
  IntegrationModuleOptions,
  LicenseState,
  LicenseStateMap,
  PackageMetaMap,
} from "../types"

const VERIFIER_PACKAGE = "@gorgo-store/license"

type ReportLicense = (input: {
  license?: string
  backendUrl?: string
  packageName: string
  track: (event: string, props?: Record<string, unknown>) => void
}) => boolean

type LicenseStateReader = (
  packageName: string,
) => { state: LicenseState; reason?: string } | undefined

type Verifier = {
  reportLicense: ReportLicense
  licenseState?: LicenseStateReader
}

function safeResolve(container: any, key: string): any {
  try {
    return container.resolve(key)
  } catch {
    return undefined
  }
}

function loadVerifier(): Verifier | null {
  try {
    const mod = require(VERIFIER_PACKAGE)
    const api = mod?.default ?? mod
    const fn = (mod?.reportLicense ?? api?.reportLicense) as unknown
    if (typeof fn !== "function") return null
    const state = (mod?.licenseState ?? api?.licenseState) as unknown
    return {
      reportLicense: fn as ReportLicense,
      licenseState: typeof state === "function" ? (state as LicenseStateReader) : undefined,
    }
  } catch {
    return null
  }
}

/**
 * Check the license of every registered provider whose package declares `gorgo.license`.
 * One check per npm package, never per instance. The verdict is registered in the container
 * so the admin surface can read it; a package the verifier cannot judge never blocks boot.
 */
export default async ({
  container,
  options,
}: LoaderOptions<IntegrationModuleOptions>): Promise<void> => {
  const state: LicenseStateMap = licenseStateStore()
  try {
    ;(container as any).register({
      [INTEGRATION_LICENSE_STATE_KEY]: asValue(state),
    })
  } catch {
    // a container without register (unit tests) still gets the checks below
  }

  const verifier = loadVerifier()
  if (!verifier) return

  const packageMeta: PackageMetaMap =
    safeResolve(container, INTEGRATION_PACKAGE_META_KEY) ?? {}
  const backendUrl = safeResolve(container, "configModule")?.admin?.backendUrl
  const license = options?.license ?? process.env.GORGO_LICENSE

  const registrations = (container as any).registrations ?? {}
  const keys = Object.keys(registrations).filter((key) =>
    key.startsWith(IntegrationProviderRegistrationPrefix),
  )

  const telemetry = createTelemetryClient({ packageDir: __dirname })
  const seen = new Set<string>()

  for (const key of keys) {
    const provider = safeResolve(container, key)
    const identifier = provider?.getIdentifier?.() ?? provider?.descriptor?.identifier
    if (!identifier) continue

    const meta = packageMeta[identifier]
    if (meta?.license !== "required") continue

    const packageName = meta.name
    if (!packageName) continue
    if (seen.has(packageName)) {
      state[packageName]?.identifiers.push(identifier)
      continue
    }
    seen.add(packageName)

    try {
      verifier.reportLicense({
        license,
        backendUrl,
        packageName,
        track: (event, props) => telemetry.track(event, props),
      })
      const verdict = verifier.licenseState?.(packageName)
      state[packageName] = {
        package: packageName,
        state: verdict?.state ?? "undetermined",
        ...(verdict?.reason ? { reason: verdict.reason } : {}),
        identifiers: [identifier],
      }
    } catch {
      continue
    }
  }
}

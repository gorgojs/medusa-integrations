import type { LoaderOptions } from "@medusajs/framework/types"
import { createTelemetryClient } from "@gorgo/telemetry"
import {
  INTEGRATION_PACKAGE_META_KEY,
  IntegrationProviderRegistrationPrefix,
} from "../types"
import type { IntegrationModuleOptions, PackageMetaMap } from "../types"

const VERIFIER_PACKAGE = "@gorgo-store/license"

type ReportLicense = (input: {
  license?: string
  backendUrl?: string
  packageName: string
  track: (event: string, props?: Record<string, unknown>) => void
}) => boolean

function safeResolve(container: any, key: string): any {
  try {
    return container.resolve(key)
  } catch {
    return undefined
  }
}

function loadVerifier(): ReportLicense | null {
  try {
    const mod = require(VERIFIER_PACKAGE)
    const fn = (mod?.reportLicense ?? mod?.default?.reportLicense) as unknown
    return typeof fn === "function" ? (fn as ReportLicense) : null
  } catch {
    return null
  }
}

export default async ({
  container,
  options,
}: LoaderOptions<IntegrationModuleOptions>): Promise<void> => {
  const reportLicense = loadVerifier()
  if (!reportLicense) return

  const packageMeta: PackageMetaMap =
    safeResolve(container, INTEGRATION_PACKAGE_META_KEY) ?? {}
  const backendUrl = safeResolve(container, "configModule")?.admin?.backendUrl
  const licenses = options?.licenses ?? {}

  const registrations = (container as any).registrations ?? {}
  const keys = Object.keys(registrations).filter((key) =>
    key.startsWith(IntegrationProviderRegistrationPrefix),
  )

  const telemetry = createTelemetryClient({ packageDir: __dirname })
  const seen = new Set<string>()

  for (const key of keys) {
    const provider = safeResolve(container, key)
    const descriptor = provider?.descriptor
    if (!descriptor?.requiresLicense) continue

    const identifier = provider?.getIdentifier?.() ?? descriptor.identifier
    const packageName = identifier ? packageMeta[identifier]?.name : undefined
    if (!packageName || seen.has(packageName)) continue
    seen.add(packageName)

    try {
      reportLicense({
        license: licenses[packageName] ?? process.env.GORGO_LICENSE,
        backendUrl,
        packageName,
        track: (event, props) => telemetry.track(event, props),
      })
    } catch {
      continue
    }
  }
}

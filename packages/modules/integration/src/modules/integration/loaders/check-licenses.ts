import type { LoaderOptions } from "@medusajs/framework/types"
import { createTelemetryClient } from "@gorgo/telemetry"
import { INTEGRATION_PACKAGE_META_KEY, IntegrationProviderRegistrationPrefix } from "../types"
import { addVerifier, isLicenseVerifier, linkIdentifier } from "./license-state"
import type { LicenseVerifier } from "./license-state"
import type { IntegrationModuleOptions, PackageMetaMap } from "../types"

const VERIFIER_PACKAGE = "@gorgo-store/license"

type VerdictChange = { state?: string; reason?: string }

function safeResolve(container: any, key: string): any {
  try {
    return container.resolve(key)
  } catch {
    return undefined
  }
}

/**
 * `@gorgo-store/license` lives in the private registry, so this public module does not depend on
 * it. Every paid package does, and resolving from the paid package's own directory reaches it
 * under any package manager. Without a directory, the copy this module can see is used.
 */
function loadVerifier(fromDir?: string): LicenseVerifier | null {
  try {
    const mod = fromDir
      ? require(require.resolve(VERIFIER_PACKAGE, { paths: [fromDir] }))
      : require(VERIFIER_PACKAGE)
    return isLicenseVerifier(mod) ? mod : null
  } catch {
    return fromDir ? loadVerifier() : null
  }
}

/**
 * Registers every package that declares `"gorgo": { "license": "required" }` with the process-wide
 * check of `@gorgo-store/license`, once per package however many instances it has. The check runs in
 * the background, never blocks boot and never throws; the admin reads its verdicts live.
 */
export default async ({ container, options }: LoaderOptions<IntegrationModuleOptions>): Promise<void> => {
  const packageMeta: PackageMetaMap = safeResolve(container, INTEGRATION_PACKAGE_META_KEY) ?? {}
  const configModule = safeResolve(container, "configModule")
  const logger = safeResolve(container, "logger")
  const telemetry = createTelemetryClient({ packageDir: __dirname })
  const own = new Set<string>()

  const report = (packageName: string, next: VerdictChange) => {
    if (!own.has(packageName)) return
    if (next.state === "ok") telemetry.track("license.ok", { package: packageName })
    else if (next.state === "unreachable") telemetry.track("license.unreachable", { package: packageName })
    else if (next.state === "failed") telemetry.track("license.failed", { package: packageName, reason: next.reason })
  }

  const configure = (verifier: LicenseVerifier) => {
    if (!addVerifier(verifier)) return
    verifier.configureLicense({
      license: options?.license,
      backendUrl: configModule?.admin?.backendUrl,
      workerMode: configModule?.projectConfig?.workerMode,
      logger,
      onChange: (packageName: string, next: VerdictChange) => {
        try {
          report(packageName, next)
        } catch {
          return
        }
      },
    })
  }

  const keys = Object.keys((container as any).registrations ?? {}).filter((key) =>
    key.startsWith(IntegrationProviderRegistrationPrefix),
  )

  for (const key of keys) {
    try {
      const provider = safeResolve(container, key)
      const identifier = provider?.getIdentifier?.() ?? provider?.descriptor?.identifier
      const meta = identifier ? packageMeta[identifier] : undefined
      if (meta?.license !== "required" || !meta.name) continue

      linkIdentifier(meta.name, identifier)
      if (own.has(meta.name)) continue

      const verifier = loadVerifier(meta.dir)
      if (!verifier) {
        logger?.warn?.(`[gorgo] ${meta.name} needs ${VERIFIER_PACKAGE} with registerLicensedPackage; its license is not checked.`)
        continue
      }
      configure(verifier)
      own.add(verifier.registerLicensedPackage({ packageName: meta.name, packageVersion: meta.version ?? undefined }) ?? meta.name)
    } catch {
      continue
    }
  }

  try {
    const local = loadVerifier()
    if (local) configure(local)
  } catch {
    return
  }
}

import type { LoaderOptions } from "@medusajs/framework/types"
import { configureLicense, registerLicensedPackage } from "@gorgo/license"
import { createTelemetryClient } from "@gorgo/telemetry"
import { INTEGRATION_PACKAGE_META_KEY, IntegrationProviderRegistrationPrefix } from "../types"
import type { IntegrationModuleOptions, PackageMetaMap } from "../types"

type VerdictChange = { state?: string; reason?: string }

function safeResolve(container: any, key: string): any {
  try {
    return container.resolve(key)
  } catch {
    return undefined
  }
}

/**
 * Registers every package that declares `"gorgo": { "license": "required" }` with the process-wide
 * check of `@gorgo/license`, once per package however many instances it has. Without such a package
 * the library never reaches the network. The check runs in the background, never blocks boot and
 * never throws; the admin reads its verdicts live.
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

  // Once per process, before any package registers: one listener, and the settings also reach
  // providers that register their own check, such as a plain payment provider.
  try {
    configureLicense({
      license: options?.license,
      backendUrl: configModule?.admin?.backendUrl,
      workerMode: configModule?.projectConfig?.workerMode,
      logger,
      onChange: (packageName, next) => {
        try {
          report(packageName, next)
        } catch {
          return
        }
      },
    })
  } catch {
    return
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

      if (own.has(meta.name)) continue
      own.add(registerLicensedPackage({ packageName: meta.name, packageVersion: meta.version ?? undefined }) ?? meta.name)
    } catch {
      continue
    }
  }
}

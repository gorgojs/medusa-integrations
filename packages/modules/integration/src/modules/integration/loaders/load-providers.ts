import { asFunction, asValue, Lifetime } from "@medusajs/framework/awilix"
import { moduleProviderLoader } from "@medusajs/framework/modules-sdk"
import {
  LoaderOptions,
  Logger,
  ModuleProvider,
  ModulesSdkTypes,
} from "@medusajs/framework/types"
import { createTelemetryClient, getMachineId } from "@gorgo/telemetry"
import {
  INTEGRATION_OPTIONS_KEY,
  INTEGRATION_PACKAGE_META_KEY,
  IntegrationProviderRegistrationKey,
  IntegrationProviderRegistrationPrefix,
  type PackageMetaMap,
} from "../types"
import IntegrationProviderService from "../services/integration-provider"
import { findUnmarkedSecretCandidates } from "../descriptor/introspect"
import { resolvePackageMetaByIdentifier } from "./resolve-package-meta"
import { warnDuplicateIdentifiers } from "./duplicate-identifiers"

/**
 * Registers each integration-provider class into the module container under
 * `int_<identifier>[_<id>]`, mirroring how the payment/fulfillment modules load
 * their providers. Providers come from the integration plugin's `options.providers`,
 * each entry being `{ resolve, id?, options? }`. Also exposes the resolved module
 * options (encryptionKey, …) under INTEGRATION_OPTIONS_KEY for the module service.
 */
const registrationFn = async (
  klass: any,
  container: any,
  pluginOptions: { id?: string; options?: Record<string, unknown> }
) => {
  const instanceId = pluginOptions.id ?? null
  const key = `${IntegrationProviderRegistrationPrefix}${klass.identifier}${
    instanceId ? `_${instanceId}` : ""
  }`

  container.register({
    // Pass `instanceId` as the 3rd ctor arg so the provider knows which instance it is
    // (see AbstractIntegrationProviderService.getInstanceId). The container key encodes the same.
    [key]: asFunction((cradle: any) => new klass(cradle, pluginOptions.options, instanceId), {
      lifetime: klass.LIFE_TIME || Lifetime.SINGLETON,
    }),
  })

  container.registerAdd(IntegrationProviderRegistrationKey, asValue(key))
}

type ProviderTelemetry = {
  category: string
  id: string
  package_name: string | null
  package_version: string | null
}

const trackStarted = async (container: any, packageMeta: PackageMetaMap): Promise<void> => {
  try {
    const telemetry = createTelemetryClient({ packageDir: __dirname })

    const providerService = new IntegrationProviderService(container.cradle)
    const list: ProviderTelemetry[] = providerService.listRegistrations().map((r) => {
      const meta = packageMeta[r.identifier]
      return {
        category: r.provider.descriptor.category,
        id: r.identifier,
        package_name: meta?.name ?? null,
        package_version: meta?.version ?? null,
      }
    })

    telemetry.track("plugin.started", { providers: list, provider_count: list.length })
  } catch {
    // never throw from telemetry
  }
}

/**
 * Warn once per provider about options named like a credential but not declared `secret: true`:
 * their values are shown in the admin and kept in the change history in clear text.
 */
const warnUnmarkedSecrets = (container: any, logger?: Logger): void => {
  try {
    const log = logger ?? container.resolve("logger")
    const seen = new Set<string>()
    for (const r of new IntegrationProviderService(container.cradle).listRegistrations()) {
      if (seen.has(r.identifier)) continue
      seen.add(r.identifier)
      for (const option of findUnmarkedSecretCandidates(r.provider.descriptor)) {
        log.warn(
          `[integration] Provider "${r.identifier}" declares option "${option}" without secret: true. ` +
            `Its value is shown in the admin and kept in the change history in clear text. ` +
            `Declare it secret: true if it is a credential.`
        )
      }
    }
  } catch {
    // a hint for provider authors must never break loading
  }
}

export default async ({
  container,
  options,
  logger,
}: LoaderOptions<
  (
    | ModulesSdkTypes.ModuleServiceInitializeOptions
    | ModulesSdkTypes.ModuleServiceInitializeCustomDataLayerOptions
  ) & { providers?: ModuleProvider[] }
>): Promise<void> => {
  const packageMeta = resolvePackageMetaByIdentifier(options?.providers ?? [])
  warnDuplicateIdentifiers(options?.providers ?? [], () => logger ?? container.resolve("logger"))

  container.register({
    [INTEGRATION_OPTIONS_KEY]: asValue(options ?? {}),
    [INTEGRATION_PACKAGE_META_KEY]: asValue(packageMeta),
  })

  await moduleProviderLoader({
    container,
    providers: options?.providers || [],
    registerServiceFn: registrationFn,
  })

  warnUnmarkedSecrets(container, logger)

  // Providers are now registered — announce them (guarded; never throws).
  await trackStarted(container, packageMeta)
}

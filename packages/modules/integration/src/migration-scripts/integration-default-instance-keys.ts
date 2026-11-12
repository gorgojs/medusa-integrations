import type { ExecArgs } from "@medusajs/framework/types"
import { INTEGRATION_MODULE } from "../modules/integration"
import type IntegrationModuleService from "../modules/integration/services/integration-module"
import { IntegrationProviderRegistrationPrefix as PREFIX } from "../modules/integration/types"
import { DEFAULT_INSTANCE_ID } from "../modules/integration/utils/provider-id"

// Before 2.0 a registration without an `id` was keyed `int_<identifier>`. Now it is the instance
// `default`, keyed `int_<identifier>_default`, so its settings and change history move once, when
// `medusa db:migrate` runs. Medusa records a migration script by its file name across every plugin,
// so the name carries the module's own prefix.

/** Rename every stored `provider_id` equal to `from` to `to`. */
export type LegacyKeyMove = { from: string; to: string }

type Registration = { provider_id: string; identifier: string; instance_id: string; is_configured: boolean }

/**
 * One move per registration of the default instance, from the key it had before 2.0 to its key now,
 * so every registration reads after the upgrade exactly what it read before. The old key is derived
 * from the registration, never parsed out of a stored key, because an identifier may contain `_`.
 * Nothing moves:
 * - into a default instance that already has settings, so nothing is overwritten;
 * - into a named instance, because the old settings may be another account's;
 * - out of a key that a registration still uses, such as `int_my_crm` of the instance `crm` of `my`.
 */
export function planLegacyKeyMoves(registrations: Registration[]): LegacyKeyMove[] {
  const keys = new Set(registrations.map((r) => r.provider_id))
  return registrations
    .filter((r) => r.instance_id === DEFAULT_INSTANCE_ID && !r.is_configured)
    .map((r) => ({ from: `${PREFIX}${r.identifier}`, to: r.provider_id }))
    .filter((move) => !keys.has(move.from))
}

export default async function moveIntegrationKeysToDefaultInstance({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)

  const { integrations } = await service.listIntegrationsOverview()

  let settings = 0
  let changes = 0
  for (const { from, to } of planLegacyKeyMoves(integrations)) {
    // The history goes first. If the run stops between the two updates, Medusa runs the script
    // again, and the settings, still under the old key, are found and moved then.
    changes += (
      await service.updateIntegrationChanges({ selector: { provider_id: from }, data: { provider_id: to } })
    ).length
    settings += (
      await service.updateIntegrations({ selector: { provider_id: from }, data: { provider_id: to } })
    ).length
  }
  if (!settings && !changes) return

  logger.info(
    `[integration] Moved ${settings} integration(s) and ${changes} change history entries ` +
      `to the key of the default instance, int_<identifier>_default`
  )
}

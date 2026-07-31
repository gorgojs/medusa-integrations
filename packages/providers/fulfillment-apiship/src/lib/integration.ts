import { MedusaError } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { INTEGRATION_MODULE, IntegrationModuleService } from "@gorgo/medusa-integration"
import { DEFAULT_APISHIP_PROVIDER_ID, isApishipProviderId } from "./provider-id"

/**
 * Resolve the integration module and assert that `provider_id` really names a declared
 * ApiShip registration. Guards every plugin route that accepts a `provider_id`: without it a
 * typo yields a 500 from deeper down, and another provider's id would let an ApiShip route
 * read or write a foreign integration's row.
 */
export function requireApishipIntegration(
  container: MedusaContainer,
  providerId?: string | null
): { service: IntegrationModuleService; providerId: string } {
  const id = providerId ?? DEFAULT_APISHIP_PROVIDER_ID
  const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)

  if (!isApishipProviderId(id) || !service.hasProviderId(id)) {
    // Spell out the likely cause: the default key is only registered when the provider is
    // declared WITHOUT an `id`, so hitting it usually means the caller forgot to say which
    // instance it wants.
    const hint =
      providerId == null
        ? ` No instance was requested, so the default was used — pass "provider_id" (admin) or` +
          ` "shipping_option_id" (store), or declare the provider without an "id" in medusa-config.`
        : ""
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No ApiShip integration registered for "${id}".${hint}`
    )
  }

  return { service, providerId: id }
}

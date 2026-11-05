import { MedusaError } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  INTEGRATION_MODULE,
  IntegrationModuleService,
  integrationProviderKey,
  parseIntegrationProviderKey,
} from "@gorgo/medusa-integration"
import type { AuthorizeNetOptions } from "../providers/payment-authorizenet/types"
import { ProviderKeys } from "../types"

export type AuthorizeNetIntegration = {
  service: IntegrationModuleService
  providerId: string
  instanceId: string | null
}

/**
 * Resolve the integration module and the Authorize.net instance a store request targets: the one
 * named by `provider_id` (`int_authorizenet[_<instance>]`), or the only one registered. Another
 * provider's id, an unknown one, or several instances without `provider_id` are refused, so a store
 * route never reads a foreign integration's settings.
 */
export function requireAuthorizeNetIntegration(
  container: MedusaContainer,
  providerId?: string | null
): AuthorizeNetIntegration {
  const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)

  if (providerId) {
    const parsed = parseIntegrationProviderKey(providerId, ProviderKeys.AUTHORIZENET)
    if (!parsed || !service.hasProviderId(providerId)) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `No Authorize.net integration registered for "${providerId}"`)
    }
    return { service, providerId, instanceId: parsed.instanceId }
  }

  const instances = service.listUiDescriptors().filter((d) => d.identifier === ProviderKeys.AUTHORIZENET)
  if (!instances.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "No Authorize.net integration is registered")
  }
  if (instances.length > 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${instances.length} Authorize.net integrations are registered, pass "provider_id" to choose one`
    )
  }
  const { instanceId } = instances[0]
  return { service, providerId: integrationProviderKey(ProviderKeys.AUTHORIZENET, instanceId), instanceId }
}

/**
 * The settings of an enabled, fully configured Authorize.net instance. A disabled or half-configured
 * one is invisible to shoppers, as in the payment provider.
 */
export async function resolveAuthorizeNetOptions(
  container: MedusaContainer,
  providerId?: string | null
): Promise<{ providerId: string; options: AuthorizeNetOptions }> {
  const integration = requireAuthorizeNetIntegration(container, providerId)
  const resolved = await integration.service.getResolvedOptions(ProviderKeys.AUTHORIZENET, integration.instanceId)
  if (!resolved) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Authorize.net integration "${integration.providerId}" is not available: it is either not configured, disabled, or missing required options.`
    )
  }
  return { providerId: integration.providerId, options: resolved.options as AuthorizeNetOptions }
}

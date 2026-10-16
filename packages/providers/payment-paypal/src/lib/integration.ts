import { MedusaError } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  INTEGRATION_MODULE,
  IntegrationModuleService,
  integrationProviderKey,
  parseIntegrationProviderKey,
} from "@gorgo/medusa-integration"
import type { PayPalOptions } from "../providers/integration-paypal/services/paypal-integration"
import { ProviderKeys } from "../types"

export type PayPalIntegration = {
  service: IntegrationModuleService
  providerId: string
  instanceId: string | null
}

/**
 * Resolve the integration module and the PayPal instance a store request targets: the one named by
 * `provider_id` (`int_paypal[_<instance>]`), or the only one registered. Another provider's id, an
 * unknown one, or several instances without `provider_id` are refused, so a store route never reads
 * a foreign integration's settings.
 */
export function requirePayPalIntegration(container: MedusaContainer, providerId?: string | null): PayPalIntegration {
  const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)

  if (providerId) {
    const parsed = parseIntegrationProviderKey(providerId, ProviderKeys.PAYPAL)
    if (!parsed || !service.hasProviderId(providerId)) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `No PayPal integration registered for "${providerId}"`)
    }
    return { service, providerId, instanceId: parsed.instanceId }
  }

  const instances = service.listUiDescriptors().filter((d) => d.identifier === ProviderKeys.PAYPAL)
  if (!instances.length) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "No PayPal integration is registered")
  }
  if (instances.length > 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${instances.length} PayPal integrations are registered, pass "provider_id" to choose one`
    )
  }
  const { instanceId } = instances[0]
  return { service, providerId: integrationProviderKey(ProviderKeys.PAYPAL, instanceId), instanceId }
}

/**
 * The settings of an enabled, fully configured PayPal instance. A disabled or half-configured one is
 * invisible to shoppers, as in the payment provider.
 */
export async function resolvePayPalOptions(
  container: MedusaContainer,
  providerId?: string | null
): Promise<{ providerId: string; options: PayPalOptions }> {
  const integration = requirePayPalIntegration(container, providerId)
  const resolved = await integration.service.getResolvedOptions(ProviderKeys.PAYPAL, integration.instanceId)
  if (!resolved) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `PayPal integration "${integration.providerId}" is not available: it is either not configured, disabled, or missing required options.`
    )
  }
  return { providerId: integration.providerId, options: resolved.options as PayPalOptions }
}

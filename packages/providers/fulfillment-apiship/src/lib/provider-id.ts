import { integrationProviderKey, parseIntegrationProviderKey } from "@gorgo/medusa-integration"
import { ProviderKeys } from "../types"

/** Registration key of the default (no `instance_id`) ApiShip integration. */
export const DEFAULT_APISHIP_PROVIDER_ID = integrationProviderKey(ProviderKeys.APISHIP)

/** `"apiship-1"` → `"int_apiship_apiship-1"`; nullish → the default instance's key. */
export function apishipProviderId(instanceId?: string | null): string {
  return integrationProviderKey(ProviderKeys.APISHIP, instanceId)
}

/**
 * `"int_apiship_apiship-1"` → `"apiship-1"`, `"int_apiship"` → `null` (default instance).
 * Also `null` for anything that isn't an ApiShip key — gate on {@link isApishipProviderId}.
 */
export function apishipInstanceId(providerId?: string | null): string | null {
  return parseIntegrationProviderKey(providerId, ProviderKeys.APISHIP)?.instanceId ?? null
}

/** Whether a `provider_id` addresses an ApiShip integration instance at all. */
export function isApishipProviderId(providerId?: string | null): boolean {
  return parseIntegrationProviderKey(providerId, ProviderKeys.APISHIP) !== null
}

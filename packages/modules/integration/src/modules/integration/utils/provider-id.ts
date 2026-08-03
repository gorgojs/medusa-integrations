import { IntegrationProviderRegistrationPrefix as PREFIX } from "../types"

/**
 * The `provider_id` convention, in one place: every registration is keyed
 * `int_<identifier>[_<instanceId>]`, and that key is also the stored `provider_id`.
 *
 * Pure (no container, no db) so provider packages can import it to build/parse the ids they
 * receive on their own routes without re-deriving the format.
 */
export function integrationProviderKey(identifier: string, instanceId?: string | null): string {
  return `${PREFIX}${identifier}${instanceId ? `_${instanceId}` : ""}`
}

export type ParsedIntegrationProviderKey = {
  identifier: string
  /** `null` for the default (single) instance. */
  instanceId: string | null
}

/**
 * Inverse of {@link integrationProviderKey} for a KNOWN identifier — the only direction that
 * is unambiguous, since both identifiers and instance ids may contain `_`:
 *
 *   parseIntegrationProviderKey("int_apiship_eu", "apiship") → { identifier: "apiship", instanceId: "eu" }
 *   parseIntegrationProviderKey("int_apiship",    "apiship") → { identifier: "apiship", instanceId: null }
 *   parseIntegrationProviderKey("int_tkassa",     "apiship") → null
 */
export function parseIntegrationProviderKey(
  providerId: string | null | undefined,
  identifier: string
): ParsedIntegrationProviderKey | null {
  if (!providerId) return null

  const base = integrationProviderKey(identifier)
  if (providerId === base) return { identifier, instanceId: null }

  const instancePrefix = `${base}_`
  if (!providerId.startsWith(instancePrefix)) return null

  const instanceId = providerId.slice(instancePrefix.length)
  return instanceId ? { identifier, instanceId } : null
}

import { IntegrationProviderRegistrationPrefix as PREFIX } from "../types"

/** The instance id of a registration declared without an `id`. */
export const DEFAULT_INSTANCE_ID = "default"

/**
 * The `provider_id` convention, in one place: every registration is keyed
 * `int_<identifier>_<instanceId>`, and that key is also the stored `provider_id`. A registration
 * declared without an `id` is the instance `default`, so a key always names its instance.
 *
 * Pure (no container, no db) so provider packages can import it to build/parse the ids they
 * receive on their own routes without re-deriving the format.
 */
export function integrationProviderKey(identifier: string, instanceId?: string | null): string {
  return `${PREFIX}${identifier}_${instanceId || DEFAULT_INSTANCE_ID}`
}

export type ParsedIntegrationProviderKey = {
  identifier: string
  /** `default` for a registration declared without an `id`. */
  instanceId: string
}

/**
 * Inverse of {@link integrationProviderKey} for a KNOWN identifier — the only direction that
 * is unambiguous, since both identifiers and instance ids may contain `_`:
 *
 *   parseIntegrationProviderKey("int_apiship_eu",      "apiship") → { identifier: "apiship", instanceId: "eu" }
 *   parseIntegrationProviderKey("int_apiship_default", "apiship") → { identifier: "apiship", instanceId: "default" }
 *   parseIntegrationProviderKey("int_apiship",         "apiship") → null (the key format before 2.0)
 *   parseIntegrationProviderKey("int_tkassa_default",  "apiship") → null
 */
export function parseIntegrationProviderKey(
  providerId: string | null | undefined,
  identifier: string
): ParsedIntegrationProviderKey | null {
  if (!providerId) return null

  const instancePrefix = `${PREFIX}${identifier}_`
  if (!providerId.startsWith(instancePrefix)) return null

  const instanceId = providerId.slice(instancePrefix.length)
  return instanceId ? { identifier, instanceId } : null
}

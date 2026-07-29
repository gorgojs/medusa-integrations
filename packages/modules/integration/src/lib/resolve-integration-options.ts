import { MedusaError } from "@medusajs/framework/utils"
import { getResolvedIntegrationOptionsWorkflow } from "../workflows/integration"
import type { ResolvedOptions } from "../modules/integration/services/integration-module"

export type ResolveIntegrationOptionsInput = {
  identifier: string
  instance_id?: string | null
}

/**
 * Apply the not-configured policy to a resolved-options result. Pure — the unit-tested core.
 * `resolved === null` means the integration is not configured / disabled / incomplete.
 */
export function unwrapResolvedOptions<T = Record<string, unknown>>(
  resolved: ResolvedOptions | null,
  identifier: string,
  optional?: boolean
): T | null {
  if (!resolved) {
    if (optional) return null
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Integration provider "${identifier}" is not available: it is either not configured, disabled, or missing required options. Configure and enable it before use.`
    )
  }
  return resolved.options as T
}

/**
 * Resolve an integration provider's decrypted options at runtime. Intended for payment/
 * fulfillment/etc. providers that live in their own (isolated) module container and can't
 * resolve the integration module directly — this runs the resolver workflow in the global
 * app container. Throws MedusaError(NOT_ALLOWED) when not configured, unless `{ optional: true }`.
 */
export async function resolveIntegrationOptions<T = Record<string, unknown>>(
  input: ResolveIntegrationOptionsInput
): Promise<T>
export async function resolveIntegrationOptions<T = Record<string, unknown>>(
  input: ResolveIntegrationOptionsInput,
  config: { optional?: false }
): Promise<T>
export async function resolveIntegrationOptions<T = Record<string, unknown>>(
  input: ResolveIntegrationOptionsInput,
  config: { optional: true }
): Promise<T | null>
export async function resolveIntegrationOptions<T = Record<string, unknown>>(
  input: ResolveIntegrationOptionsInput,
  config?: { optional?: boolean }
): Promise<T | null> {
  const { result } = await getResolvedIntegrationOptionsWorkflow().run({ input })
  return unwrapResolvedOptions<T>(result, input.identifier, config?.optional)
}

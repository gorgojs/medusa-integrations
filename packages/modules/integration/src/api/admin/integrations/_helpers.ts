import { MedusaRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { INTEGRATION_MODULE } from "../../../modules/integration"
import type IntegrationModuleService from "../../../modules/integration/services/integration-module"
import type { MaskedIntegration } from "../../../types"

export function service(req: MedusaRequest): IntegrationModuleService {
  return req.scope.resolve(INTEGRATION_MODULE)
}

/**
 * Assert that a `:provider_id` URL param (the registration key `int_<id>[_<instance>]`,
 * which is also the stored `provider_id`) is a declared registration. 404 otherwise.
 */
export function requireProvider(svc: IntegrationModuleService, providerId: string): void {
  if (!svc.hasProviderId(providerId)) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Unknown integration "${providerId}"`)
  }
}

/**
 * Build the client-facing view of a record. Secret options live encrypted inside `options`;
 * they are stripped here so ciphertext never reaches the browser. `configured_secrets` lists
 * the secret keys that currently have a stored value (per field), so the UI can render a
 * "leave blank to keep" hint on exactly those fields. `values` holds only the non-secret options.
 */
export function maskedView(record: any, secretKeys: string[]): MaskedIntegration {
  const secret = new Set(secretKeys)
  const stored = (record.options ?? {}) as Record<string, unknown>
  const values: Record<string, unknown> = {}
  const configured_secrets: string[] = []
  for (const [k, v] of Object.entries(stored)) {
    if (secret.has(k)) {
      if (v != null && v !== "") configured_secrets.push(k)
      continue
    }
    values[k] = v
  }
  return {
    id: record.id,
    provider_id: record.provider_id,
    category: record.category,
    title: record.title ?? null,
    is_enabled: record.is_enabled,
    configured_secrets,
    last_test_status: record.last_test_status ?? null,
    values,
  }
}

import { AuthenticatedMedusaRequest, MedusaRequest } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { INTEGRATION_MODULE } from "../../../modules/integration"
import type IntegrationModuleService from "../../../modules/integration/services/integration-module"
import type { MaskedIntegration } from "../../../types"
import { secretFieldNames } from "../../../modules/integration/descriptor/introspect"
import type { IntegrationDescriptor } from "../../../modules/integration/descriptor/define"
import type { DiffEntry, DiffSecretEntry, IntegrationChangeActor } from "../../../types/integration/history"

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

/**
 * Who makes a change, for the change history: the authenticated actor (a user or an API key)
 * and where the request came from.
 */
export function changeActor(req: AuthenticatedMedusaRequest): IntegrationChangeActor {
  return {
    type: req.auth_context?.actor_type ?? "system",
    id: req.auth_context?.actor_id ?? null,
    ip: req.ip ?? null,
    user_agent: req.get("user-agent") ?? null,
    request_id: req.requestId ?? null,
  }
}

/**
 * The list filters of the change history. `q` is not a column: it becomes a case-insensitive
 * match on the author (email or API key title), the `provider_id` and the provider identifier.
 */
export function changeFilters(filterable: Record<string, unknown>): Record<string, unknown> {
  const { q, ...filters } = filterable
  if (typeof q !== "string" || !q) return filters
  const like = { $ilike: `%${q.replace(/[\\%_]/g, "\\$&")}%` }
  return { ...filters, $or: [{ actor_label: like }, { provider_id: like }, { identifier: like }] }
}

/**
 * The requested fields plus `provider_id`, which `maskSecretValues` needs to find the descriptor.
 * Without it a request like `?fields=diff` would get back values that are secret now.
 */
export function withProviderId(fields: string[] | undefined): string[] {
  const list = fields?.length ? fields : ["*"]
  return list.includes("provider_id") || list.includes("*") ? list : [...list, "provider_id"]
}

/**
 * Hide values the CURRENT descriptor treats as secret. A diff entry `{ field, from, to }` recorded
 * while the option was still plain becomes `{ field, label, secret: true, op: "hidden" }`. Entries
 * that are already secret stay as they are. Without a descriptor (provider not registered) the
 * change is returned unchanged. Pure: the input is not mutated, the stored row is not rewritten.
 */
export function maskSecretValues<T extends { diff?: unknown }>(
  change: T,
  descriptor: IntegrationDescriptor | undefined
): T {
  if (!descriptor || !Array.isArray(change.diff)) return change
  const secret = new Set(secretFieldNames(descriptor))
  if (secret.size === 0) return change
  const diff = (change.diff as DiffEntry[]).map((entry): DiffEntry => {
    if (!entry || typeof entry !== "object" || "secret" in entry || !secret.has(entry.field)) return entry
    const hidden: DiffSecretEntry = { field: entry.field, secret: true, op: "hidden" }
    if (entry.label !== undefined) hidden.label = entry.label
    return hidden
  })
  return { ...change, diff }
}

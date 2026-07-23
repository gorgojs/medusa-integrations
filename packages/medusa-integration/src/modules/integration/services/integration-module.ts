import { MedusaService } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import Integration from "../models/integration"
import { deriveKey } from "./crypto"
import { encryptSecretsInline, decryptSecretsInline } from "./secrets"
import IntegrationProviderService from "./integration-provider"
import type { IntegrationDescriptor, TestConnectionResult } from "../descriptor/define"
import { introspectDescriptor, secretFieldNames, type UiDescriptor } from "../descriptor/introspect"
import { isDescriptorComplete } from "../descriptor/validate"
import { INTEGRATION_OPTIONS_KEY, INTEGRATION_PACKAGE_META_KEY, DOCS_URL, type IntegrationModuleOptions, type PackageMetaMap } from "../types"
import type { IntegrationOverviewItem } from "../../../types"
import type { CategoryKind } from "../../../types/integration"

type InjectedDependencies = {
  logger?: Logger
  integrationProviderService: IntegrationProviderService
  [INTEGRATION_OPTIONS_KEY]?: IntegrationModuleOptions
  [INTEGRATION_PACKAGE_META_KEY]?: PackageMetaMap
}

export type ResolvedOptions = {
  options: Record<string, unknown>
  meta: { provider_id: string; category: string | null; is_enabled: boolean }
}

export type IntegrationOverviewQuery = {
  q?: string
  category?: string
  limit?: number
  offset?: number
}

export type IntegrationOverviewResult = {
  integrations: IntegrationOverviewItem[]
  count: number
  categories: CategoryKind[]
}

const CACHE_TTL_MS = 60_000

export default class IntegrationModuleService extends MedusaService({
  Integration,
}) {
  protected providerService_: IntegrationProviderService
  protected options_: IntegrationModuleOptions
  protected packageMeta_: PackageMetaMap
  protected cache_ = new Map<string, { value: ResolvedOptions | null; expiresAt: number }>()
  protected key_?: Buffer

  constructor(deps: InjectedDependencies) {
    super(...arguments)
    this.providerService_ = deps.integrationProviderService
    this.options_ = deps[INTEGRATION_OPTIONS_KEY] ?? {}
    this.packageMeta_ = deps[INTEGRATION_PACKAGE_META_KEY] ?? {}
  }

  // ── descriptors (sourced from registered integration-providers) ──────────────
  /** UI descriptors for every registration (one per instance). */
  listUiDescriptors(): UiDescriptor[] {
    return this.providerService_.listRegistrations().map((r) =>
      introspectDescriptor({ ...r.provider.descriptor, identifier: r.identifier, instanceId: r.instanceId })
    )
  }

  /** Stamped descriptor (schema + identifier/instanceId) for one `provider_id`. */
  getProviderDescriptor(providerId: string): IntegrationDescriptor | undefined {
    const r = this.providerService_.getRegistration(providerId)
    if (!r) return undefined
    return { ...r.provider.descriptor, identifier: r.identifier, instanceId: r.instanceId }
  }

  /** UI descriptor for one `provider_id` (container key). */
  getProviderUiDescriptor(providerId: string): UiDescriptor | undefined {
    const r = this.providerService_.getRegistration(providerId)
    if (!r) return undefined
    return introspectDescriptor({ ...r.provider.descriptor, identifier: r.identifier, instanceId: r.instanceId })
  }

  /** Whether a provider is registered under this `provider_id` (container key). */
  hasProviderId(providerId: string): boolean {
    return !!this.providerService_.getRegistration(providerId)
  }

  /**
   * The single stored row for a `provider_id` (it's unique), or `undefined`. One place for
   * the "load the row for this provider" lookup shared by the service, steps and routes.
   */
  async findByProviderId(providerId: string) {
    const [record] = await this.listIntegrations({ provider_id: providerId }, { take: 1 })
    return record
  }

  /**
   * Full decrypted config (non-secret options + decrypted secrets) for one `provider_id`,
   * or `{}` if no row exists. Used at write time to merge submitted option values over the
   * rest of the stored config without losing secrets the form never sends back.
   */
  async getStoredValues(providerId: string): Promise<Record<string, unknown>> {
    const record = await this.findByProviderId(providerId)
    return record ? this.assembleValues(record) : {}
  }

  /**
   * Whether a loaded row passes full validation against its provider's descriptor (all
   * required options present + every option's `validate` and the cross-section `validate`).
   * Derived on demand — never persisted — so it can't drift when the descriptor changes.
   */
  isComplete(record: any): boolean {
    const descriptor = this.getProviderDescriptor(record.provider_id)
    if (!descriptor) return false
    return isDescriptorComplete(descriptor, this.assembleValues(record))
  }

  /** Decrypt inline secret keys within a loaded record's `options` → plaintext values. */
  protected assembleValues(record: any): Record<string, unknown> {
    const options = ((record.options as Record<string, unknown>) ?? {})
    const descriptor = this.getProviderDescriptor(record.provider_id)
    const secretKeys = descriptor ? secretFieldNames(descriptor) : []
    if (secretKeys.length === 0) return { ...options }
    return decryptSecretsInline(options, secretKeys, this.getKey())
  }

  /**
   * Admin overview: every declared instance (registration) merged with its current row
   * state, then filtered + paginated server-side. `categories` is the UNFILTERED facet so
   * the UI's tab bar stays stable while a tab is active. No secrets.
   */
  async listIntegrationsOverview(query: IntegrationOverviewQuery = {}): Promise<IntegrationOverviewResult> {
    const regs = this.providerService_.listRegistrations()
    const rows = await this.listIntegrations({}, { take: 1000 })
    const byId = new Map(rows.map((r: any) => [r.provider_id, r]))

    const all: IntegrationOverviewItem[] = regs.map((r) => {
      const d = r.provider.descriptor
      const row: any = byId.get(r.key)
      const meta = this.packageMeta_[r.identifier]
      return {
        provider_id: r.key,
        identifier: r.identifier,
        instance_id: r.instanceId,
        category: d.category,
        display_name: d.displayName,
        description: d.description,
        icon: d.icon,
        version: meta?.version ?? null,
        author: meta?.author ?? null,
        author_url: meta?.authorUrl ?? null,
        supports_multiple_instances: d.supportsMultipleInstances ?? false,
        has_test_connection: typeof d.testConnection === "function",
        is_configured: !!row,
        is_enabled: row?.is_enabled ?? false,
        is_complete: row ? this.isComplete(row) : false,
        last_test_status: row?.last_test_status ?? null,
      }
    })

    // Unfiltered facet — distinct categories across every registration (stable tab bar).
    const categories = [...new Set(all.map((i) => i.category))] as CategoryKind[]

    let filtered = all
    if (query.category) filtered = filtered.filter((i) => i.category === query.category)

    const q = query.q?.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter((i) =>
        [i.display_name, i.identifier, i.instance_id, i.description]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q))
      )
    }

    const count = filtered.length
    const offset = query.offset ?? 0
    const limit = query.limit ?? filtered.length
    const integrations = filtered.slice(offset, offset + limit)

    return { integrations, count, categories }
  }

  /**
   * Run the connection test against the currently-resolved settings.
   * Delegates to the descriptor's `testConnection` (if it declares one).
   */
  async runTestConnection(providerId: string): Promise<TestConnectionResult> {
    let provider
    try {
      provider = this.providerService_.retrieveByKey(providerId)
    } catch {
      return { status: "failed", message: `Unknown integration provider "${providerId}"` }
    }
    const testConnection = provider.descriptor.testConnection
    if (!testConnection) {
      return { status: "skipped", message: "No test configured" }
    }
    const resolved = await this.getResolvedOptions(provider.getIdentifier(), provider.getInstanceId())
    if (!resolved) {
      return { status: "failed", message: "Not configured" }
    }
    try {
      return await testConnection({ options: resolved.options })
    } catch (e: any) {
      return { status: "failed", message: e?.message ?? "Test failed" }
    }
  }

  /** Docs URL for the admin list CTA + footer, from options or the default. */
  getDocsUrl(): string {
    return DOCS_URL
  }

  // ── encryption ───────────────────────────────────────────────────────────────
  /** The configured passphrase (any non-empty string). Throws if missing. */
  protected resolveKey(): string {
    const key = this.options_.encryptionKey
    if (key && key.length > 0) return key
    throw new Error(
      "[integration] encryptionKey is required. Set GORGO_INTEGRATION_ENCRYPTION_KEY to any " +
        "non-empty secret (high-entropy recommended, e.g. `openssl rand -hex 32`)."
    )
  }

  /** The derived 32-byte AES key, computed once from the passphrase. */
  protected getKey(): Buffer {
    return (this.key_ ??= deriveKey(this.resolveKey()))
  }

  /** Secret option ids declared by the provider for a `provider_id` (empty if none/unknown). */
  getSecretKeys(providerId: string): string[] {
    const descriptor = this.getProviderDescriptor(providerId)
    return descriptor ? secretFieldNames(descriptor) : []
  }

  /**
   * Build the `options` object to persist: secret keys encrypted inline (base64 iv‖tag‖ct),
   * non-secret keys as-is. Requires a configured key only when the descriptor has secrets.
   */
  encryptForStorage(
    descriptor: IntegrationDescriptor,
    values: Record<string, unknown>
  ): Record<string, unknown> {
    const secretKeys = secretFieldNames(descriptor)
    if (secretKeys.length === 0) return { ...values }
    return encryptSecretsInline(values, secretKeys, this.getKey())
  }

  // ── resolver (runtime read, cached) ──────────────────────────────────────────
  /** Clear the resolved-options cache for one `provider_id`, or all when omitted. */
  clearOptionsCache(providerId?: string): void {
    if (!providerId) {
      this.cache_.clear()
      return
    }
    this.cache_.delete(providerId)
  }

  /**
   * Resolve decrypted options for a `(identifier, instanceId)` pair (the consumer-facing
   * shape) — mapped internally to the `provider_id` key `int_<identifier>[_<instanceId>]`.
   */
  async getResolvedOptions(
    identifier: string,
    instanceId?: string | null
  ): Promise<ResolvedOptions | null> {
    const providerId = IntegrationProviderService.key(identifier, instanceId)
    const hit = this.cache_.get(providerId)
    if (hit && hit.expiresAt > Date.now()) return hit.value

    // The provider_id must correspond to a declared registration. A miss here is a
    // misconfiguration (forgot to register / wrong id), distinct from "registered but
    // not configured yet" (handled below by returning null).
    if (!this.hasProviderId(providerId)) {
      throw new Error(
        `No integration provider registered for "${providerId}". ` +
          `Declare it in medusa-config under the integration plugin's options.providers.`
      )
    }

    const record = await this.findByProviderId(providerId)

    let value: ResolvedOptions | null = null
    // An incomplete config is invisible to consumers (treated like "not configured"), so a
    // partially-filled draft can never leak into a provider mid-setup. Completeness is the
    // full validation: every option + the descriptor's cross-section `validate`.
    if (record && record.is_enabled) {
      const descriptor = this.getProviderDescriptor(providerId)!
      const assembled = this.assembleValues(record)
      if (isDescriptorComplete(descriptor, assembled)) {
        // Apply option defaults for fields the user never set explicitly.
        const parsed = descriptor.optionsSchema.safeParse(assembled)
        value = {
          options: parsed.success ? (parsed.data as Record<string, unknown>) : assembled,
          meta: {
            provider_id: record.provider_id,
            category: record.category ?? null,
            is_enabled: record.is_enabled,
          },
        }
      }
    }
    this.cache_.set(providerId, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    return value
  }
}

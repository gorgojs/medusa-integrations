import { InjectManager, MedusaContext, MedusaError, MedusaService } from "@medusajs/framework/utils"
import type { Context, Logger } from "@medusajs/framework/types"
import type { EntityManager } from "@medusajs/framework/mikro-orm/knex"
import Integration from "../models/integration"
import IntegrationChange from "../models/integration-change"
import { deriveKey } from "./crypto"
import { encryptSecretsInline, decryptSecretsInline, decryptPlainOptions } from "./secrets"
import IntegrationProviderService from "./integration-provider"
import type { IntegrationDescriptor, TestConnectionResult } from "../descriptor/define"
import { introspectDescriptor, secretFieldNames, type UiDescriptor } from "../descriptor/introspect"
import { isDescriptorComplete } from "../descriptor/validate"
import {
  INTEGRATION_OPTIONS_KEY,
  INTEGRATION_PACKAGE_META_KEY,
  type IntegrationModuleOptions,
  type LicenseStateEntry,
  type PackageMetaMap,
} from "../types"
import { licenseStates, recheckLicense } from "@gorgo/license"
import { toLicenseStateEntries } from "../utils/license-entry"
import { loadCatalog } from "../../../lib/catalog"
import type { IntegrationOverviewItem, CatalogItem } from "../../../types"
import type { CategoryKind } from "../../../types/integration"
import type {
  IntegrationChangeField,
  IntegrationChangeUser,
  RecordIntegrationChangeInput,
} from "../../../types/integration/history"
import { diffFields } from "../descriptor/diff"

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
  IntegrationChange,
}) {
  protected logger_?: Logger
  protected providerService_: IntegrationProviderService
  protected options_: IntegrationModuleOptions
  protected packageMeta_: PackageMetaMap
  protected cache_ = new Map<string, { value: ResolvedOptions | null; expiresAt: number }>()
  protected key_?: Buffer

  constructor(deps: InjectedDependencies) {
    super(...arguments)
    this.logger_ = deps.logger
    this.providerService_ = deps.integrationProviderService
    this.options_ = deps[INTEGRATION_OPTIONS_KEY] ?? {}
    this.packageMeta_ = deps[INTEGRATION_PACKAGE_META_KEY] ?? {}
  }

  /**
   * License verdict per npm package, read live from `@gorgo/license`: the packages the loader
   * registered plus every package that registers itself. The check runs in the background, so a
   * verdict can still be pending.
   */
  listLicenseStates(): LicenseStateEntry[] {
    try {
      return toLicenseStateEntries(licenseStates(), this.packageMeta_)
    } catch {
      return []
    }
  }

  /** Checks every licensed package right away, for "Check now", and returns the fresh verdicts. */
  async recheckLicenseStates(): Promise<LicenseStateEntry[]> {
    try {
      await recheckLicense()
    } catch {
      // the verdicts below still show what the library last knew
    }
    return this.listLicenseStates()
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

  /**
   * A loaded record's `options` in plain text, with the secrets decrypted. A value saved before its
   * option's `secret` flag changed is read too (see `decryptSecretsInline`). Throws a `MedusaError`
   * when a secret doesn't decrypt.
   */
  protected assembleValues(record: any): Record<string, unknown> {
    const options = ((record.options as Record<string, unknown>) ?? {})
    return decryptSecretsInline(options, this.getSecretKeys(record.provider_id), () => this.getKey(), record.provider_id)
  }

  /**
   * A loaded record's `options` with the secret ones left as stored and the plain ones readable,
   * including a value encrypted while its option was still secret. Never throws, so the Admin can
   * show a record whose secrets no longer decrypt.
   */
  readPlainOptions(record: any): Record<string, unknown> {
    const options = ((record.options as Record<string, unknown>) ?? {})
    return decryptPlainOptions(options, this.getSecretKeys(record.provider_id), () => this.getKey())
  }

  /**
   * Admin overview: every declared instance (registration) merged with its current row
   * state, then filtered + paginated server-side. `categories` is the UNFILTERED facet so
   * the UI's tab bar stays stable while a tab is active. No secrets.
   */
  async listIntegrationsOverview(query: IntegrationOverviewQuery = {}): Promise<IntegrationOverviewResult> {
    const regs = this.providerService_.listRegistrations()
    const rows = await this.listIntegrations({}, { take: null })
    const byId = new Map(rows.map((r: any) => [r.provider_id, r]))

    const all: IntegrationOverviewItem[] = regs.map((r) => {
      const d = r.provider.descriptor
      const row: any = byId.get(r.key)
      return {
        provider_id: r.key,
        identifier: r.identifier,
        instance_id: r.instanceId,
        category: d.category,
        display_name: d.displayName,
        description: d.description,
        icon: d.icon,
        ...this.mapPackageMeta(r.identifier),
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

    // The name and the description are translation keys, so `q` matches only the identifier and the
    // instance. The admin loads the whole list and searches the translated text itself.
    const q = query.q?.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter((i) =>
        [i.identifier, i.instance_id].filter(Boolean).some((s) => String(s).toLowerCase().includes(q))
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
    // Options that can't be read, for example a secret that doesn't decrypt, fail the test with
    // their message, the same as a test that throws.
    try {
      const resolved = await this.getResolvedOptions(provider.getIdentifier(), provider.getInstanceId())
      if (!resolved) {
        return { status: "failed", message: "Not configured" }
      }
      return await testConnection({ options: resolved.options })
    } catch (e: any) {
      return { status: "failed", message: e?.message ?? "Test failed" }
    }
  }

  /** Map a provider identifier to its public package-meta fields (snake_case), or nulls. */
  private mapPackageMeta(identifier: string | undefined): { version: string | null; author: string | null; author_url: string | null } {
    const meta = identifier ? this.packageMeta_[identifier] : undefined
    return { version: meta?.version ?? null, author: meta?.author ?? null, author_url: meta?.authorUrl ?? null }
  }

  /**
   * Package metadata (version/author) for one `provider_id` — resolved by the registration's
   * `identifier` from the loader-injected map. Feeds the detail page's identity header.
   * Returns nulls when the provider is unregistered or its package wasn't resolvable.
   */
  getPackageMeta(providerId: string): { version: string | null; author: string | null; author_url: string | null } {
    return this.mapPackageMeta(this.providerService_.getRegistration(providerId)?.identifier)
  }

  /**
   * The integration catalog (from the live Gorgo catalog API via loadCatalog(), with an offline fallback) merged with local install state: each entry gets
   * `installed`/`provider_id` by matching its `integrationId` to a registered provider's
   * `identifier`. 1c is a plain module (not an integration provider) → always not installed.
   */
  async getCatalog(): Promise<CatalogItem[]> {
    const catalog = await loadCatalog()
    const { integrations } = await this.listIntegrationsOverview()
    // Keyed by identifier; if one identifier has multiple registered instances, the last wins
    // (catalog "installed" is per-integration, so Settings links to that single provider_id).
    const byId = new Map(integrations.map((i) => [i.identifier, i]))
    return catalog.map((c) => {
      const reg = byId.get(c.integrationId)
      return { ...c, installed: !!reg, provider_id: reg?.provider_id ?? null }
    })
  }

  // ── encryption ───────────────────────────────────────────────────────────────
  /** The configured passphrase (any non-empty string). Throws a `MedusaError` if missing. */
  protected resolveKey(): string {
    const key = this.options_.encryptionKey
    if (key && key.length > 0) return key
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "[integration] encryptionKey is required. Pass it in the integration plugin's options in " +
        "medusa-config, for example `encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY`, set " +
        "to any non-empty secret (high-entropy recommended, for example `openssl rand -hex 32`)."
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

  // ── settings change history ──────────────────────────────────────────────────
  /**
   * Store one entry of the settings change history. Never throws: a history that cannot be
   * written must not break the change it describes, so a failure is logged and `null` returned.
   */
  async recordChange(input: RecordIntegrationChangeInput): Promise<string | null> {
    try {
      const created = await this.createIntegrationChanges({
        ...(input.created_at && { created_at: input.created_at }),
        actor_type: input.actor.type,
        actor_id: input.actor.id ?? null,
        actor_label: input.actor_label ?? null,
        change_type: input.change_type,
        provider_id: input.provider_id,
        diff: (input.diff ?? []) as unknown as Record<string, unknown>,
        diff_fields: diffFields(input.diff ?? []),
        metadata: input.metadata ?? null,
        request_id: input.actor.request_id ?? null,
        ip: input.actor.ip ?? null,
        user_agent: input.actor.user_agent ?? null,
      })
      return created.id
    } catch (e: any) {
      this.logger_?.warn(
        `[integration] could not record a ${input.change_type} change for ${input.provider_id}: ${e?.message ?? e}`
      )
      return null
    }
  }

  /**
   * Every option the history names, once per id and label key. The search needs them: the admin
   * shows translated labels, which the database does not have, so it matches the search against
   * them itself and sends back the keys. Read from `diff`, so removed options and integrations
   * are included.
   */
  @InjectManager()
  async listChangeFields(@MedusaContext() sharedContext: Context<EntityManager> = {}): Promise<IntegrationChangeField[]> {
    const rows: { field: string; label: string | null }[] = await sharedContext.manager!.execute(
      `select distinct e->>'field' as field, e->>'label' as label
       from integration_change c
       cross join lateral jsonb_array_elements(
         case when jsonb_typeof(c.diff) = 'array' then c.diff else '[]'::jsonb end
       ) e
       where c.deleted_at is null and e->>'field' is not null
       order by field, label`
    )
    return rows.map((row) => ({ field: row.field, label: row.label ?? null }))
  }

  /**
   * Who the history names, for its author filter: every admin user with the email stored with
   * their latest change, and whether anything else made changes (an API key, code run without a
   * request). A removed account stays in the list as long as its changes do.
   */
  @InjectManager()
  async listChangeActors(
    @MedusaContext() sharedContext: Context<EntityManager> = {}
  ): Promise<{ users: IntegrationChangeUser[]; system: boolean }> {
    const manager = sharedContext.manager!
    const users: { id: string; label: string | null }[] = await manager.execute(
      `select distinct on (actor_id) actor_id as id, actor_label as label
       from integration_change
       where deleted_at is null and actor_type = 'user' and actor_id is not null
       order by actor_id, actor_label is null, created_at desc`
    )
    const [{ system }]: { system: boolean }[] = await manager.execute(
      `select exists (
         select 1 from integration_change
         where deleted_at is null and (actor_type <> 'user' or actor_id is null)
       ) as system`
    )
    return { users: users.map((user) => ({ id: user.id, label: user.label ?? null })), system: !!system }
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
   * shape) — mapped internally to the `provider_id` key `int_<identifier>_<instanceId>`; an omitted
   * or null instance is `default`.
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

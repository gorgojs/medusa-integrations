import { IntegrationProviderRegistrationPrefix } from "../types"
import type { AbstractIntegrationProvider } from "../utils/abstract-integration-provider"
import type { IntegrationDescriptor } from "../descriptor/define"

type InjectedDependencies = {
  [key: `${typeof IntegrationProviderRegistrationPrefix}${string}`]: AbstractIntegrationProvider
}

/** A single registered provider = one integration *instance*. */
export type ProviderRegistration = {
  /** Container key `int_<identifier>[_<id>]` — the instance's stable identity. */
  key: string
  identifier: string
  instanceId: string | null
  provider: AbstractIntegrationProvider
}

/**
 * Thin registry over the integration-providers registered into the module container by
 * `loadProviders`. Each registration in `options.providers` is one instance, identified
 * by its container key `int_<identifier>[_<id>]` — which is also the DB `provider_id`.
 * Instances are declared in medusa-config, not created at runtime. `identifier`/`instanceId`
 * (= `getIdentifier()`/`getInstanceId()`) are derived for descriptors/UI.
 *
 * Intentionally minimal: it locates providers; callers invoke provider methods directly,
 * so new provider methods never require changes here.
 */
export default class IntegrationProviderService {
  protected dependencies_: InjectedDependencies

  constructor(container: InjectedDependencies) {
    this.dependencies_ = container
  }

  /** Build the container key for a `(identifier, instanceId)` pair. */
  static key(identifier: string, instanceId?: string | null): string {
    return `${IntegrationProviderRegistrationPrefix}${identifier}${instanceId ? `_${instanceId}` : ""}`
  }

  /** All registered provider instances. */
  listProviders(): AbstractIntegrationProvider[] {
    return Object.keys(this.dependencies_)
      .filter((k) => k.startsWith(IntegrationProviderRegistrationPrefix))
      .map((k) => this.dependencies_[k as keyof InjectedDependencies])
  }

  /** Every registration with its derived `(identifier, instanceId)` identity. */
  listRegistrations(): ProviderRegistration[] {
    return Object.keys(this.dependencies_)
      .filter((k) => k.startsWith(IntegrationProviderRegistrationPrefix))
      .map((k) => {
        const provider = this.dependencies_[k as keyof InjectedDependencies]
        return {
          key: k,
          identifier: provider.getIdentifier(),
          instanceId: provider.getInstanceId(),
          provider,
        }
      })
  }

  /** Resolve a provider by its exact container key. */
  retrieveByKey(key: string): AbstractIntegrationProvider {
    const provider = this.dependencies_[key as keyof InjectedDependencies]
    if (!provider) {
      throw new Error(
        `Unable to retrieve integration provider "${key}". Make sure it is registered in medusa-config under the integration plugin's \`options.providers\`.`
      )
    }
    return provider
  }

  /** Resolve the provider for a `(identifier, instanceId)` pair. */
  retrieveProvider(identifier: string, instanceId?: string | null): AbstractIntegrationProvider {
    return this.retrieveByKey(IntegrationProviderService.key(identifier, instanceId))
  }

  /** Whether a provider is registered for this `(identifier, instanceId)` pair. */
  hasProvider(identifier: string, instanceId?: string | null): boolean {
    return !!this.dependencies_[
      IntegrationProviderService.key(identifier, instanceId) as keyof InjectedDependencies
    ]
  }

  /** Resolve `(identifier, instanceId)` from a container key, or undefined if unregistered. */
  getRegistration(key: string): ProviderRegistration | undefined {
    return this.listRegistrations().find((r) => r.key === key)
  }

  /**
   * Descriptors of every registered provider — feeds the introspection/UI pipeline.
   * `identifier`/`instanceId` are stamped from each registration, so authors never repeat
   * them in the descriptor. One descriptor per registration (one per instance).
   */
  listDescriptors(): IntegrationDescriptor[] {
    return this.listRegistrations().map((r) => ({
      ...r.provider.descriptor,
      identifier: r.identifier,
      instanceId: r.instanceId,
    }))
  }
}

import type { IntegrationDescriptorInput } from "../descriptor/define"

/**
 * Base class AND contract for integration-providers. A plugin ships a subclass and
 * registers it via `ModuleProvider(INTEGRATION_MODULE, { services: [MyProvider] })`.
 *
 *   export class TkassaIntegrationProvider extends AbstractIntegrationProviderService {
 *     static identifier = "tkassa"
 *     get descriptor() { return tkassaDescriptor }
 *   }
 *
 * The whole provider contract — options, sections, cross-section `validate` and
 * `testConnection` — is declared in the descriptor (`defineIntegration`); the class only
 * pairs a `static identifier` with that descriptor.
 *
 * `static identifier` becomes the descriptor's `identifier` (settings are stored/resolved
 * under it); authors don't repeat it in the descriptor.
 *
 * Each registration in `options.providers` is one *instance*: its `id` (if any) is
 * injected by the loader and exposed via `getInstanceId()`. A provider registered
 * without an `id` is the single (default) instance — `getInstanceId()` returns null.
 * The container key `int_<identifier>[_<id>]` is the instance's stable identity.
 */
export abstract class AbstractIntegrationProviderService {
  static identifier: string

  /** The registration `id` (from `options.providers[].id`), injected by the loader. */
  protected readonly instanceId_: string | null

  constructor(_container?: unknown, _options?: unknown, instanceId?: string | null) {
    this.instanceId_ = instanceId ?? null
  }

  /** Optional fail-fast validation of the provider's `options` at load time. */
  static validateOptions(_options: Record<string, unknown>): void | never {}

  getIdentifier(): string {
    return (this.constructor as typeof AbstractIntegrationProviderService).identifier
  }

  /** This instance's id (the registration `id`), or null for the single/default instance. */
  getInstanceId(): string | null {
    return this.instanceId_
  }

  /** This plugin's descriptor (options + sections + `validate` + `testConnection`). */
  abstract get descriptor(): IntegrationDescriptorInput
}

/**
 * The name before 2.0. Since its fulfillment providers, Medusa names the base class of each
 * provider type `Abstract<Module>ProviderService`, and this class follows it.
 * @deprecated Use `AbstractIntegrationProviderService`. The alias stays through every 2.x release
 * and is removed in 3.0.
 */
export const AbstractIntegrationProvider = AbstractIntegrationProviderService
/** @deprecated Use `AbstractIntegrationProviderService`. The alias is removed in 3.0. */
export type AbstractIntegrationProvider = AbstractIntegrationProviderService

export default AbstractIntegrationProviderService

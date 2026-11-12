import { asFunction, asValue, Lifetime } from "@medusajs/framework/awilix"
import { IntegrationProviderRegistrationKey } from "../types"
import { integrationProviderKey } from "../utils/provider-id"

/**
 * Registers one integration-provider class into the module container under
 * `int_<identifier>_<instanceId>`, mirroring how the payment/fulfillment modules load
 * their providers. A registration without an `id` is the instance `default`.
 *
 * A key registered twice would silently replace the first registration, so the second one is
 * refused: two entries with the same `id`, or an `id: "default"` next to an entry without one.
 */
export const registerIntegrationProvider = (
  klass: any,
  container: any,
  pluginOptions: { id?: string; options?: Record<string, unknown> }
): void => {
  const instanceId = pluginOptions.id ?? null
  const key = integrationProviderKey(klass.identifier, instanceId)

  if (container.hasRegistration(key)) {
    throw new Error(
      `[integration] The integration "${key}" is registered more than once. Give each registration of ` +
        `the provider "${klass.identifier}" in the integration plugin's options.providers its own id. ` +
        `A registration without an id is the instance "default".`
    )
  }

  container.register({
    // Pass `instanceId` as the 3rd ctor arg so the provider knows which instance it is
    // (see AbstractIntegrationProviderService.getInstanceId). The container key encodes the same.
    [key]: asFunction((cradle: any) => new klass(cradle, pluginOptions.options, instanceId), {
      lifetime: klass.LIFE_TIME || Lifetime.SINGLETON,
    }),
  })

  container.registerAdd(IntegrationProviderRegistrationKey, asValue(key))
}

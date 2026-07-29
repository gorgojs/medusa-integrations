import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { DEFAULT_APISHIP_PROVIDER_ID } from "../../types/apiship"
import { ProviderKeys } from "../../types"

export type ResolveApishipProviderIdStepInput = {
  shipping_option_id: string
}

/**
 * Derives the ApiShip integration `provider_id` (`int_apiship[_<instance>]`) that backs a
 * given shipping option, by reading the medusa-config.ts fulfillment module declaration
 * (not by parsing/matching id naming conventions — several fulfillment providers can be
 * registered with unrelated top-level ids, only their `options.id` maps to the ApiShip
 * integration instance).
 */
export const resolveApishipProviderIdStep = createStep(
  "resolve-apiship-provider-id-step",
  async ({ shipping_option_id }: ResolveApishipProviderIdStepInput, { container }) => {
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
    const shippingOption = await fulfillmentModuleService.retrieveShippingOption(
      shipping_option_id,
      { select: ["id", "provider_id"] }
    )

    const configModule = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
    const fulfillmentModuleConfig = configModule.modules?.[Modules.FULFILLMENT] as
      | { options?: { providers?: Array<{ resolve?: string; id?: string; options?: Record<string, unknown> }> } }
      | undefined

    const entry = (fulfillmentModuleConfig?.options?.providers ?? []).find(
      (provider) => `${ProviderKeys.APISHIP}_${provider.id}` === shippingOption.provider_id
    )

    if (!entry) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Shipping option "${shipping_option_id}" is not fulfilled by ApiShip`
      )
    }

    const instanceId = entry.options?.id as string | undefined

    return new StepResponse(
      instanceId ? `${DEFAULT_APISHIP_PROVIDER_ID}_${instanceId}` : DEFAULT_APISHIP_PROVIDER_ID
    )
  }
)

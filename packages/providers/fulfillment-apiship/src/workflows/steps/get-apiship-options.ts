import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INTEGRATION_MODULE, IntegrationModuleService } from "@gorgo/medusa-integration"
import type { DeepPartial, ApishipOptionsDTO } from "../../types/apiship"
import { DEFAULT_APISHIP_PROVIDER_ID } from "../../types/apiship"

export type GetApishipOptionsStepInput = {
  provider_id?: string
}

export const getApishipOptionsStep = createStep(
  "get-apiship-options-step",
  async ({ provider_id }: GetApishipOptionsStepInput = {}, { container }) => {
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    const stored = (await service.getStoredValues(
      provider_id ?? DEFAULT_APISHIP_PROVIDER_ID
    )) as DeepPartial<ApishipOptionsDTO>

    const connections = (stored.settings?.connections ?? []).flatMap(
      (connection) => {
        if (
          !connection?.id ||
          !connection.provider_key ||
          !connection.provider_connect_id ||
          connection.is_enabled === undefined
        ) {
          return []
        }

        return [
          {
            id: connection.id,
            name: connection.name,
            provider_key: connection.provider_key,
            provider_connect_id: connection.provider_connect_id,
            point_in_id: connection.point_in_id,
            point_in_address: connection.point_in_address,
            is_enabled: connection.is_enabled,
          },
        ]
      }
    )

    return new StepResponse({
      token: stored.token ?? "",
      is_test: stored.is_test ?? false,
      settings: {
        connections,
        default_sender_settings: {
          country_code:
            stored.settings?.default_sender_settings?.country_code ?? "",
          address_string:
            stored.settings?.default_sender_settings?.address_string ??
            "",
          contact_name:
            stored.settings?.default_sender_settings?.contact_name ?? "",
          phone: stored.settings?.default_sender_settings?.phone ?? "",
        },
        default_product_sizes: {
          length:
            stored.settings?.default_product_sizes?.length ?? 10,
          width: stored.settings?.default_product_sizes?.width ?? 10,
          height:
            stored.settings?.default_product_sizes?.height ?? 10,
          weight:
            stored.settings?.default_product_sizes?.weight ?? 20,
        },
        delivery_cost_vat:
          stored.settings?.delivery_cost_vat ??
          (-1 as ApishipOptionsDTO["settings"]["delivery_cost_vat"]),
        is_cod: stored.settings?.is_cod ?? false,
      },
    })
  }
)

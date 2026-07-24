import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { StoreDTO } from "@medusajs/framework/types"
import type { DeepPartial, ApishipOptionsDTO } from "../../types/apiship"

export type GetApishipOptionsStepInput = {
  store: StoreDTO
}

export const getApishipOptionsStep = createStep(
  "get-apiship-options-step",
  async ({ store }: GetApishipOptionsStepInput) => {
    const metadata = store.metadata
    const apishipOptions = (metadata?.apiship ?? {}) as DeepPartial<ApishipOptionsDTO>
    const connections = (apishipOptions.settings?.connections ?? []).flatMap(
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
      token: apishipOptions.token ?? "",
      is_test: apishipOptions.is_test ?? false,
      settings: {
        connections,
        default_sender_settings: {
          country_code:
            apishipOptions.settings?.default_sender_settings?.country_code ?? "",
          address_string:
            apishipOptions.settings?.default_sender_settings?.address_string ??
            "",
          contact_name:
            apishipOptions.settings?.default_sender_settings?.contact_name ?? "",
          phone: apishipOptions.settings?.default_sender_settings?.phone ?? "",
        },
        default_product_sizes: {
          length:
            apishipOptions.settings?.default_product_sizes?.length ?? 10,
          width: apishipOptions.settings?.default_product_sizes?.width ?? 10,
          height:
            apishipOptions.settings?.default_product_sizes?.height ?? 10,
          weight:
            apishipOptions.settings?.default_product_sizes?.weight ?? 20,
        },
        delivery_cost_vat:
          apishipOptions.settings?.delivery_cost_vat ??
          (-1 as ApishipOptionsDTO["settings"]["delivery_cost_vat"]),
        is_cod: apishipOptions.settings?.is_cod ?? false,
      },
    })
  }
)

import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import type { IStoreModuleService } from "@medusajs/framework/types"
import type { ApishipOptionsDTO, DeepPartial } from "../../types/apiship"

const DEFAULT_APISHIP_OPTIONS = {
  is_test: false,
  settings: {
    is_cod: false,
    default_product_sizes: {
      length: 10,
      width: 10,
      height: 10,
      weight: 20,
    },
  },
}

export const getStoreStep = createStep(
  "get-store-step",
  async (_, { container }) => {
    const storeModuleService =
      container.resolve<IStoreModuleService>(Modules.STORE)

    const stores = await storeModuleService.listStores(
      {},
      { select: ["id", "metadata"], take: 1 }
    )

    const store = stores?.[0]

    const metadata = store.metadata
    const apiship = (metadata?.apiship ?? {}) as DeepPartial<ApishipOptionsDTO>

    const needsUpdate =
      !metadata?.apiship ||
      apiship.is_test === undefined ||
      apiship.settings?.is_cod === undefined ||
      apiship.settings?.default_product_sizes?.length === undefined ||
      apiship.settings?.default_product_sizes?.width === undefined ||
      apiship.settings?.default_product_sizes?.height === undefined ||
      apiship.settings?.default_product_sizes?.weight === undefined

    if (!needsUpdate) {
      return new StepResponse(store)
    }

    const merged: DeepPartial<ApishipOptionsDTO> = {
      ...DEFAULT_APISHIP_OPTIONS,
      ...apiship,
      settings: {
        ...DEFAULT_APISHIP_OPTIONS.settings,
        ...apiship.settings,
        default_product_sizes: {
          ...DEFAULT_APISHIP_OPTIONS.settings.default_product_sizes,
          ...apiship.settings?.default_product_sizes,
        },
      },
    }

    const updatedStore = await storeModuleService.updateStores(store.id, {
      metadata: {
        ...metadata,
        apiship: merged,
      },
    })

    return new StepResponse(updatedStore)
  }
)
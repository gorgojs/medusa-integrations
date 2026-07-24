import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { updateStoresStep } from "@medusajs/medusa/core-flows"
import type {
  ApishipConnectionDTO,
  ApishipOptionsDTO,
  DeepPartial,
} from "../types/apiship"
import { FulfillmentProviderKeys } from "../types/apiship"

const getStoreStep = createStep(
  "get-store-step",
  async (_, { container }) => {
    const storeModuleService = container.resolve(Modules.STORE)
    const stores = await storeModuleService.listStores(
      {},
      { select: ["id", "metadata"], take: 1 }
    )
    const store = stores?.[0]

    return new StepResponse(store)
  }
)

export type DeleteApishipConnectionsWorkflowInput = {
  ids: string[]
}

type ComposeDeletedApishipConnectionsStepInput = {
  store: {
    id: string
    metadata?: Record<string, any> | null
  }
  ids: string[]
}

const composeDeletedApishipConnectionsStep = createStep(
  "compose-deleted-apiship-connections-step",
  async ({ store, ids }: ComposeDeletedApishipConnectionsStepInput) => {
    const existingMetadata = (store.metadata ?? {}) as Record<string, any>
    const existingApiship =
      ((existingMetadata[FulfillmentProviderKeys.APISHIP] as DeepPartial<ApishipOptionsDTO> | undefined) ??
        {}) as DeepPartial<ApishipOptionsDTO>

    const existingConnections =
      (existingApiship.settings?.connections ?? []) as ApishipConnectionDTO[]
    const idsSet = new Set(ids)

    const deletedConnections = existingConnections.filter((item) =>
      idsSet.has(item.id)
    )

    if (!deletedConnections.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Connections with ids: ${ids.join(", ")} not found`
      )
    }

    const nextConnections = existingConnections.filter(
      (item) => !idsSet.has(item.id)
    )

    const nextMetadata = {
      ...existingMetadata,
      [FulfillmentProviderKeys.APISHIP]: {
        ...existingApiship,
        settings: {
          ...(existingApiship.settings ?? {}),
          connections: nextConnections,
        },
      },
    }

    return new StepResponse({
      storeId: store.id,
      metadata: nextMetadata,
      connections: deletedConnections,
    })
  }
)

export const deleteApishipConnectionsWorkflow = createWorkflow(
  "delete-apiship-connections",
  ({ ids }: DeleteApishipConnectionsWorkflowInput) => {
    const store = getStoreStep()

    const result = composeDeletedApishipConnectionsStep({
      store,
      ids,
    })

    updateStoresStep({
      selector: { id: result.storeId },
      update: { metadata: result.metadata },
    })

    return new WorkflowResponse(result.connections)
  }
)

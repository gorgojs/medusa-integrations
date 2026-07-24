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

type ComposeUpdatedApishipConnectionStepInput = {
  store: {
    id: string
    metadata?: Record<string, any> | null
  }
  input: UpdateApishipConnectionWorkflowInput
}

const composeUpdatedApishipConnectionStep = createStep(
  "compose-updated-apiship-connection-step",
  async ({ store, input }: ComposeUpdatedApishipConnectionStepInput) => {
    const existingMetadata = (store.metadata ?? {}) as Record<string, any>

    const existingApiship =
      ((existingMetadata[FulfillmentProviderKeys.APISHIP] as DeepPartial<ApishipOptionsDTO> | undefined) ??
        {}) as DeepPartial<ApishipOptionsDTO>

    const existingConnections =
      (existingApiship.settings?.connections ?? []) as ApishipConnectionDTO[]

    const connectionIndex = existingConnections.findIndex(
      (item) => item.id === input.id
    )

    if (connectionIndex === -1) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Connection with id: ${input.id} not found`
      )
    }

    const existingConnection = existingConnections[connectionIndex]

    const updatedConnection = {
      ...existingConnection,
      ...input.update,
    }

    const updatedConnections = [...existingConnections]
    updatedConnections[connectionIndex] = updatedConnection

    const nextMetadata = {
      ...existingMetadata,
      [FulfillmentProviderKeys.APISHIP]: {
        ...existingApiship,
        settings: {
          ...(existingApiship.settings ?? {}),
          connections: updatedConnections,
        },
      },
    }

    return new StepResponse({
      storeId: store.id,
      metadata: nextMetadata,
      connection: updatedConnection,
    })
  }
)

export type UpdateApishipConnectionWorkflowInput = {
  id: string
  update: {
    provider_key?: string
    name?: string
    provider_connect_id?: string
    point_in_id?: string
    point_in_address?: string
    is_enabled?: boolean
  }
}

export const updateApishipConnectionWorkflow = createWorkflow(
  "update-apiship-connection",
  (input: UpdateApishipConnectionWorkflowInput) => {
    const store = getStoreStep()

    const result = composeUpdatedApishipConnectionStep({
      store,
      input,
    })

    updateStoresStep({
      selector: { id: result.storeId },
      update: { metadata: result.metadata },
    })

    return new WorkflowResponse(result.connection)
  }
)

import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { updateStoresStep } from "@medusajs/medusa/core-flows"
import { ulid } from "ulid"
import type { DeepPartial, ApishipOptionsDTO } from "../types/apiship"
import type { AdminCreateApishipConnection } from "../types/http"
import { getStoreStep } from "./steps/get-store"

export type ComposeCreatedApishipConnectionsStepInput = {
  store: {
    id: string
    metadata?: Record<string, any> | null
  }
  input: CreateApishipConnectionsWorkflowInput
}

const composeCreatedApishipConnectionsStep = createStep(
  "compose-created-apiship-connections-step",
  async ({ store, input }: ComposeCreatedApishipConnectionsStepInput) => {
    const existingMetadata = (store.metadata ?? {}) as Record<string, any>
    const existingApiship =
      (existingMetadata?.apiship ?? {}) as DeepPartial<ApishipOptionsDTO>

    const existingConnections = existingApiship.settings?.connections ?? []

    const createdConnections = input.connections.map((connection) => ({
      id: `ascon_${ulid()}`,
      ...connection
    }))

    const nextMetadata = {
      ...existingMetadata,
      apiship: {
        ...existingApiship,
        settings: {
          ...(existingApiship.settings ?? {}),
          connections: [...existingConnections, ...createdConnections],
        },
      },
    }

    return new StepResponse({
      storeId: store.id,
      metadata: nextMetadata,
      connections: createdConnections,
    })
  }
)

export type CreateApishipConnectionsWorkflowInput = {
  connections: AdminCreateApishipConnection[]
}

export const createApishipConnectionsWorkflow = createWorkflow(
  "create-apiship-connections",
  (input: CreateApishipConnectionsWorkflowInput) => {
    const store = getStoreStep()
    const { storeId, metadata, connections } = composeCreatedApishipConnectionsStep({
      store,
      input,
    })
    updateStoresStep({
      selector: { id: storeId },
      update: { metadata },
    })
    return new WorkflowResponse(connections)
  }
)

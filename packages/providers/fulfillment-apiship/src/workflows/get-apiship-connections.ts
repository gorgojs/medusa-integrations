import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { getStoreStep } from "./steps/get-store"
import { getApishipOptionsStep } from "./steps/get-apiship-options"
import type { ApishipOptionsDTO } from "../types/apiship"


export type GetApishipConnectionStepInput = {
  apishipOptions: ApishipOptionsDTO
  id?: string
}

const getApishipConnectionStep = createStep(
  "get-apiship-connection-step",
  async ({ apishipOptions, id }: GetApishipConnectionStepInput) => {
    const connections = apishipOptions.settings?.connections ?? []
    if (id) {
      const connection = connections.find((item) => item.id === id)
      if (!connection) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Connection with id: ${id} not found`
        )
      }
      return new StepResponse([connection])
    }
    return new StepResponse(connections)
  }
)

export type GetApishipConnectionsWorkflowInput = {
  id?: string
}

export const getApishipConnectionsWorkflow = createWorkflow(
  "get-apiship-connections",
  ({ id }: GetApishipConnectionsWorkflowInput = {}) => {
    const store = getStoreStep()
    const apishipOptions = getApishipOptionsStep({ store })
    const connections = getApishipConnectionStep({
      apishipOptions,
      id,
    })
    return new WorkflowResponse(connections)
  }
)

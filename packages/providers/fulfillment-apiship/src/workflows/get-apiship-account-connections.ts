import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { getApishipOptionsStep } from "./steps/get-apiship-options"
import { validateApishipOptionsStep } from "./steps/validate-apiship-options"
import { createApishipClient } from "../lib/client"

export type FetchApishipAccountConnectionsStepInput = {
  apishipClientConfig: {
    token: string
    isTest: boolean
  }
}

export const fetchApishipAccountConnectionsStep = createStep(
  "fetch-apiship-account-connections-step",
  async ({ apishipClientConfig }: FetchApishipAccountConnectionsStepInput) => {
    const { connectionsApi } = createApishipClient(apishipClientConfig)

    const { data } = await connectionsApi.getListConnections()

    if (!data.rows) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Failed to retrieve connection from ApiShip`
      )
    }

    const apishipAccountConnections = (data.rows ?? []).map((row) => ({
      id: row.id!,
      provider_key: row.providerKey!,
      name: row.name!,
    }))

    return new StepResponse(apishipAccountConnections)
  }
)

export type GetApishipAccountConnectionsWorkflowInput = {
  provider_id?: string
}

export const getApishipAccountConnectionsWorkflow = createWorkflow(
  "get-apiship-account-connections",
  ({ provider_id }: GetApishipAccountConnectionsWorkflowInput = {}) => {
    const apishipOptions = getApishipOptionsStep({ provider_id })
    const apishipClientConfig = validateApishipOptionsStep({ apishipOptions })
    const connections = fetchApishipAccountConnectionsStep({ apishipClientConfig })
    return new WorkflowResponse(connections)
  }
)

import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { INTEGRATION_MODULE, IntegrationModuleService } from "@gorgo/medusa-integration"
import type {
  ApishipConnectionDTO,
  ApishipOptionsDTO,
  DeepPartial,
} from "../types/apiship"
import { DEFAULT_APISHIP_PROVIDER_ID } from "../types/apiship"
import { upsertApishipConfigStep } from "./steps/upsert-apiship-config"

type ComposeUpdatedApishipConnectionStepInput = UpdateApishipConnectionWorkflowInput

const composeUpdatedApishipConnectionStep = createStep(
  "compose-updated-apiship-connection-step",
  async (input: ComposeUpdatedApishipConnectionStepInput, { container }) => {
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    const existing = (await service.getStoredValues(
      input.provider_id ?? DEFAULT_APISHIP_PROVIDER_ID
    )) as DeepPartial<ApishipOptionsDTO>

    const existingConnections =
      (existing.settings?.connections ?? []) as ApishipConnectionDTO[]

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

    const merged = {
      ...existing,
      settings: {
        ...(existing.settings ?? {}),
        connections: updatedConnections,
      },
    }

    return new StepResponse({
      values: merged,
      connection: updatedConnection,
    })
  }
)

export type UpdateApishipConnectionWorkflowInput = {
  id: string
  provider_id?: string
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
    const result = composeUpdatedApishipConnectionStep(input)
    upsertApishipConfigStep({ values: result.values, provider_id: input.provider_id })
    return new WorkflowResponse(result.connection)
  }
)

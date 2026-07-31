import { createStep, createWorkflow, StepResponse, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { upsertIntegrationWorkflow } from "@gorgo/medusa-integration"
import type {
  ApishipConnectionDTO,
  StoredApishipOptions
} from "../types/apiship"
import { requireApishipIntegration } from "../lib/integration"
import { DEFAULT_APISHIP_PROVIDER_ID } from "../lib/provider-id"

type ComposeUpdatedApishipConnectionStepInput = UpdateApishipConnectionWorkflowInput

const composeUpdatedApishipConnectionStep = createStep(
  "compose-updated-apiship-connection-step",
  async (input: ComposeUpdatedApishipConnectionStepInput, { container }) => {
    const { service, providerId } = requireApishipIntegration(container, input.provider_id)
    const existing = (await service.getStoredValues(providerId)) as StoredApishipOptions

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

    return new StepResponse({
      settings: {
        ...(existing.settings ?? {}),
        connections: updatedConnections,
      },
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
    const { settings, connection } = composeUpdatedApishipConnectionStep(input)

    upsertIntegrationWorkflow.runAsStep({
      input: transform({ input, settings }, (d) => ({
        provider_id: d.input.provider_id ?? DEFAULT_APISHIP_PROVIDER_ID,
        values: { settings: d.settings },
      })),
    })

    return new WorkflowResponse(connection)
  }
)

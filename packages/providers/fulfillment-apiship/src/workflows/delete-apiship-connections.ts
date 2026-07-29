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

export type DeleteApishipConnectionsWorkflowInput = {
  ids: string[]
  provider_id?: string
}

type ComposeDeletedApishipConnectionsStepInput = DeleteApishipConnectionsWorkflowInput

const composeDeletedApishipConnectionsStep = createStep(
  "compose-deleted-apiship-connections-step",
  async ({ ids, provider_id }: ComposeDeletedApishipConnectionsStepInput, { container }) => {
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    const existing = (await service.getStoredValues(
      provider_id ?? DEFAULT_APISHIP_PROVIDER_ID
    )) as DeepPartial<ApishipOptionsDTO>

    const existingConnections =
      (existing.settings?.connections ?? []) as ApishipConnectionDTO[]
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

    const merged = {
      ...existing,
      settings: {
        ...(existing.settings ?? {}),
        connections: nextConnections,
      },
    }

    return new StepResponse({
      values: merged,
      connections: deletedConnections,
    })
  }
)

export const deleteApishipConnectionsWorkflow = createWorkflow(
  "delete-apiship-connections",
  ({ ids, provider_id }: DeleteApishipConnectionsWorkflowInput) => {
    const result = composeDeletedApishipConnectionsStep({ ids, provider_id })
    upsertApishipConfigStep({ values: result.values, provider_id })
    return new WorkflowResponse(result.connections)
  }
)

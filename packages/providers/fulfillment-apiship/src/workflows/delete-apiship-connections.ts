import { createStep, createWorkflow, StepResponse, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { upsertIntegrationWorkflow } from "@gorgo/medusa-integration"
import type {
  ApishipConnectionDTO,
  StoredApishipOptions
} from "../types/apiship"
import { requireApishipIntegration } from "../lib/integration"
import { DEFAULT_APISHIP_PROVIDER_ID } from "../lib/provider-id"

export type DeleteApishipConnectionsWorkflowInput = {
  ids: string[]
  provider_id?: string
}

type ComposeDeletedApishipConnectionsStepInput = DeleteApishipConnectionsWorkflowInput

const composeDeletedApishipConnectionsStep = createStep(
  "compose-deleted-apiship-connections-step",
  async ({ ids, provider_id }: ComposeDeletedApishipConnectionsStepInput, { container }) => {
    const { service, providerId } = requireApishipIntegration(container, provider_id)
    const existing = (await service.getStoredValues(providerId)) as StoredApishipOptions

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

    return new StepResponse({
      settings: {
        ...(existing.settings ?? {}),
        connections: nextConnections,
      },
      connections: deletedConnections,
    })
  }
)

export const deleteApishipConnectionsWorkflow = createWorkflow(
  "delete-apiship-connections",
  (input: DeleteApishipConnectionsWorkflowInput) => {
    const result = composeDeletedApishipConnectionsStep(input)

    upsertIntegrationWorkflow.runAsStep({
      input: transform({ input, result }, (d) => ({
        provider_id: d.input.provider_id ?? DEFAULT_APISHIP_PROVIDER_ID,
        values: { settings: d.result.settings },
      })),
    })

    return new WorkflowResponse(result.connections)
  }
)

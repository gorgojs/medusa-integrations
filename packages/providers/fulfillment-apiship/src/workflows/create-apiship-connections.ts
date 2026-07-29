import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { INTEGRATION_MODULE, IntegrationModuleService } from "@gorgo/medusa-integration"
import { ulid } from "ulid"
import type { DeepPartial, ApishipOptionsDTO } from "../types/apiship"
import { DEFAULT_APISHIP_PROVIDER_ID } from "../types/apiship"
import type { AdminCreateApishipConnection } from "../types/http"
import { upsertApishipConfigStep } from "./steps/upsert-apiship-config"

export type ComposeCreatedApishipConnectionsStepInput = CreateApishipConnectionsWorkflowInput

const composeCreatedApishipConnectionsStep = createStep(
  "compose-created-apiship-connections-step",
  async ({ connections, provider_id }: ComposeCreatedApishipConnectionsStepInput, { container }) => {
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    const existing = (await service.getStoredValues(
      provider_id ?? DEFAULT_APISHIP_PROVIDER_ID
    )) as DeepPartial<ApishipOptionsDTO>

    const existingConnections = existing.settings?.connections ?? []

    const createdConnections = connections.map((connection) => ({
      id: `ascon_${ulid()}`,
      ...connection
    }))

    const merged = {
      ...existing,
      settings: {
        ...(existing.settings ?? {}),
        connections: [...existingConnections, ...createdConnections],
      },
    }

    return new StepResponse({
      values: merged,
      connections: createdConnections,
    })
  }
)

export type CreateApishipConnectionsWorkflowInput = {
  connections: AdminCreateApishipConnection[]
  provider_id?: string
}

export const createApishipConnectionsWorkflow = createWorkflow(
  "create-apiship-connections",
  (input: CreateApishipConnectionsWorkflowInput) => {
    const { values, connections } = composeCreatedApishipConnectionsStep(input)
    upsertApishipConfigStep({ values, provider_id: input.provider_id })
    return new WorkflowResponse(connections)
  }
)

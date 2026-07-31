import { createStep, createWorkflow, StepResponse, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import { upsertIntegrationWorkflow } from "@gorgo/medusa-integration"
import { ulid } from "ulid"
import type { StoredApishipOptions } from "../types/apiship"
import { requireApishipIntegration } from "../lib/integration"
import { DEFAULT_APISHIP_PROVIDER_ID } from "../lib/provider-id"
import type { AdminCreateApishipConnection } from "../types/http"

export type ComposeCreatedApishipConnectionsStepInput = CreateApishipConnectionsWorkflowInput

const composeCreatedApishipConnectionsStep = createStep(
  "compose-created-apiship-connections-step",
  async ({ connections, provider_id }: ComposeCreatedApishipConnectionsStepInput, { container }) => {
    const { service, providerId } = requireApishipIntegration(container, provider_id)
    const existing = (await service.getStoredValues(providerId)) as StoredApishipOptions

    const existingConnections = existing.settings?.connections ?? []

    const createdConnections = connections.map((connection) => ({
      id: `ascon_${ulid()}`,
      ...connection
    }))

    return new StepResponse({
      settings: {
        ...(existing.settings ?? {}),
        connections: [...existingConnections, ...createdConnections],
      },
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
    const { settings, connections } = composeCreatedApishipConnectionsStep(input)

    upsertIntegrationWorkflow.runAsStep({
      input: transform({ input, settings }, (d) => ({
        provider_id: d.input.provider_id ?? DEFAULT_APISHIP_PROVIDER_ID,
        values: { settings: d.settings },
      })),
    })

    return new WorkflowResponse(connections)
  }
)

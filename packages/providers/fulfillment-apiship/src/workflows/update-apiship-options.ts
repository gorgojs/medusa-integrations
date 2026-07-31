import { createStep, createWorkflow, StepResponse, transform } from "@medusajs/framework/workflows-sdk"
import { upsertIntegrationWorkflow } from "@gorgo/medusa-integration"
import { requireApishipIntegration } from "../lib/integration"
import { DEFAULT_APISHIP_PROVIDER_ID } from "../lib/provider-id"
import type { ApishipConnectionDTO, DeepPartial, StoredApishipOptions } from "../types/apiship"

export type ComposeApishipSettingsStepInput = {
  provider_id?: string
  connections?: DeepPartial<ApishipConnectionDTO>[]
}

/**
 * Build the next `settings` blob. The integration module merges at the OPTION level and the
 * blob is a single `json` option, so replacing the list has to happen here — the stored value
 * is read first so an omitted `connections` leaves it untouched.
 */
const composeApishipSettingsStep = createStep(
  "compose-apiship-settings-step",
  async ({ provider_id, connections }: ComposeApishipSettingsStepInput, { container }) => {
    const { service, providerId } = requireApishipIntegration(container, provider_id)
    const stored = (await service.getStoredValues(providerId)) as StoredApishipOptions

    return new StepResponse({
      connections: connections ?? stored.settings?.connections ?? [],
    })
  }
)

/**
 * Replace the connection list. Everything else in the config belongs to a descriptor section
 * and is written through `POST /admin/integrations/:provider_id`.
 */
export type UpdateApishipOptionsWorkflowInput = {
  provider_id?: string
  connections?: DeepPartial<ApishipConnectionDTO>[]
}

export const updateApishipOptionsWorkflow = createWorkflow(
  "update-apiship-options",
  (input: UpdateApishipOptionsWorkflowInput) => {
    // Pick the connection list explicitly rather than spreading the input: a stray option
    // that belongs to a descriptor section must never reach the blob through this workflow.
    const settings = composeApishipSettingsStep(
      transform({ input }, (d) => ({
        provider_id: d.input.provider_id,
        connections: d.input.connections,
      }))
    )

    upsertIntegrationWorkflow.runAsStep({
      input: transform({ input, settings }, (d) => ({
        provider_id: d.input.provider_id ?? DEFAULT_APISHIP_PROVIDER_ID,
        values: { settings: d.settings },
      })),
    })
  }
)
